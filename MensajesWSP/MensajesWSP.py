# -*- coding: utf-8 -*-
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import eel
import csv
import sys, os
import json


eel.init('web')

# Define rutas de archivos que se ocuparan en la ejecución
# application_path ->   ruta de la carpeta temporal cuando se ejecuta .exe
#                       ruta de carpeta en modo desarrollo
# exeFile_rootPath ->   ruta de archivo .exe (cuando se ejecuta .exe)
if getattr(sys, 'frozen', False):
    # If the application is run as a bundle, the PyInstaller bootloader
    # extends the sys module by a flag frozen=True and sets the app 
    # path into variable _MEIPASS'.
    application_path = sys._MEIPASS
    exeFile_rootPath = os.path.dirname(os.path.realpath(sys.argv[0])) + "/"
else:
    application_path = os.path.dirname(os.path.abspath(__file__))
    exeFile_rootPath = ''

# Define credenciales a usar desde archivo "config.json"
# Define y dipomiviliza en variable global "credenciales"
def setCredenciales():
    credenciales = {}
    try:
        #Mejor agregar uno por uno y ver si hay errores.
        with open(exeFile_rootPath+"config.json") as jsonCredenciales:
            dict = json.load(jsonCredenciales)
            dict["numeroOrigen"]
            dict["account_sid"]
            dict["auth_token"]
            credenciales = dict
    except EnvironmentError:
        eel.errorConfig()
    except KeyError:
        eel.errorConfig()
    return credenciales
credenciales = setCredenciales()

# Función no tiene uso especifico, en un futuro se podría ocupar para
#   realizar comprobaciones al archivo csv
@eel.expose
def consultarContactos(nombrada):
    resultado = []
    for nombrado in nombrada:
        resultado.append(nombrado)
    return resultado



# Función que es gatillada desde Javascript
# dataMensajes: lista de diccionarios que tienen información de los mensajes a enviar
# ejecuta "enviar" que envia el mensaje ingresado
# Gatilla "conteoMensajes" para que se actualice el conteo de mensajes enviados en el navegador
# Retorna los resultados e informacion importante de los mensajes enviados
@eel.expose
def enviarMensajes(dataMensajes):
    result = dataMensajes
    cantidadMensajes = len(dataMensajes)
    contador = 0
    # Itera por la lista de diccionarios
    for mensaje in dataMensajes:
        # Gatilla el la función que envia mensajes
        feedback = enviar(mensaje)
        result[contador]['sid'] = feedback[0]
        result[contador]['error_code'] = feedback[1]
        result[contador]['mensaje_completo'] = feedback[2]
        contador = contador+1
        # Gatilla función de Javascript que actualiza el conteo de mensajes enviados
        eel.conteoMensajes(contador,cantidadMensajes)
    return result


# Envia mensajes wsp
# Retorna informacion referente al mensaje enviado
def enviar(destinatario):
    client = Client(credenciales['account_sid'], credenciales['auth_token'])
    #to='whatsapp:+56947589107'
    #'Your {nombre} code is {texto}'
    mensaje_completo = f'Your {destinatario["Nombre"]} code is {destinatario["Mensaje"]}'
    try:
        message = client.messages.create( 
                                from_=f'whatsapp:{credenciales["numeroOrigen"]}',  
                                body=mensaje_completo,      
                                to=f'whatsapp:{destinatario["Celular"]}' 
                            )
        sid=message.sid
        return [sid,0,mensaje_completo]
    # Si no se pudo enviar el mensaje por temas de credenciales o conexión
    except TwilioRestException as e:
        error_code = e.code
        # No hay identificador de mensaje (sid) por lo que se asigna como 0
        return [0,error_code,mensaje_completo]

# Abre y retorna el archivo contenedor del diccionario de errores de Twilio
def errorsDict():
    file = open(application_path+'/web/files/twilio-error-codes.json')
    data = json.load(file)
    file.close()
    return data

# Envia una solicitud que retorna información del estado del mesaje según sid del mensaje
def status(sid,codigo_error):
    # No hubo error anterior en el envio del mensaje
    if(sid != 0):
        # Consulta status por medio de libreria Twilio
        client = Client(credenciales['account_sid'],credenciales['auth_token'])  
        message = client.messages.get(sid).fetch()
        status = message.status
        # No hay error en status
        if(message.error_code==None):
            return [status,codigo_error,"",sid]
        # Si hay error en status
        else:
            return [status,message.error_code,sid]
    # Error anterior en el envio del mensaje
    else:
        return ['failed',codigo_error,sid]


# Función que busca información del error con codigo "code" en la lista de diccionarios "dict"
# Retorna descripción del error
def buscarErrorMensaje(code,dict):
    # Texto por defecto si no encuentra el error en la lista de errores
    error_mensaje = 'Error no identificado'
    # Itera en la lista
    for error in dict:
        # Lo encontro
        if str(error['code']) == str(code):
            error_mensaje = error['message']
    return error_mensaje

# Función que itera los mensajes y gatilla consultas de la función status()
# Retorna [informacion del estado de los mensajes, datos para la generación del archivo CSV]
#   informacion del estado de los mensajes ->   lista de diccionarios con llaves igual a los tipos de estados de los mensajes
#   datos para la generación del archivo CSV -> [[fila_CSV_1],[fila_CSV_2],...,[fila_CSV_X]]
@eel.expose
def statusWSP(parametros):
    resultado = {}
    #[rut,n_persona,msj_enviado,estado(éxito o fracaso)]
    csvData = []
    for i in range(0,len(parametros),1):
        res = status(parametros[i]['sid'],parametros[i]['error_code'])
        #res.append(parametros[i]['Rut'])
        if(not (res[0] in resultado)):
            resultado[res[0]]=[]
        resultado[res[0]].append(res)
        estado_csv = ''
        error_mensaje = ''
        if(res[1]==None or res[1]==0):
            estado_csv = "Éxito"
        else:
            estado_csv = "Fracaso"
            errorDict = errorsDict()
            error_mensaje = buscarErrorMensaje(res[1],errorDict)
        csvData.append([parametros[i]['Celular'],parametros[i]['mensaje_completo'],estado_csv,res[1],error_mensaje])
        # Gatilla función para actualizar conteo de consulta de estados en la aplicación 
        eel.conteoStatusWSP(i+1,len(parametros))
    return [resultado,csvData]


# Indica archivo html a renderizar
eel.start("MensajesWSP.html")
