var variables;
var nombradaCSV;
var mainArchivoNombrada;//archivo que contendra toda la info
var statusWSPVar;
var csvData;

// Función que es llamada desde python para notificar que "config.json" tiene problemas
// Cierra la aplicación
eel.expose(errorConfig);
function errorConfig(){
  alert('Error en el archivo de configuración');
  window.open("", "_self");
  window.close();
}
// Envia a python el archivo para que lo maneje
function consultarContactos(archivo){
  eel.consultarContactos(archivo)(callbackConsultaContactos);
}

// Cuando llega la respuesta de python, los datos se asignan a una variable global
// Renderiza información del archivo
function callbackConsultaContactos(contactos) {
  mainArchivoNombrada = contactos
  //renderizar nombrados x contactos
  var nombradaProcesada = document.getElementById('nombradaProcesada');
  nombradaProcesada.innerHTML = '<br>Se han identificado '+mainArchivoNombrada.length+ ' mensajes a enviar';
  renderizarConfirmEnvio();
}

// Renderiza diálogo de confirmación de envío de mensajes
function renderizarConfirmEnvio(){
  var elementoConfirmacion = document.getElementById('confirmacionEnvio');
  elementoConfirmacion.classList.add("card");
  elementoConfirmacion.innerHTML =`<div class="card-body">
  <h5 class="card-title">¿Deseas enviar mensajes?</h5>
  <form id="confirmacionEnvio">
  <input type="button" value="Enviar" onclick="enviarMenssajes()" class="btn btn-outline-primary">
  
</form></div>`
}


// Gatilla funcion de python que envia los mensajes a Whatsapp
// Inicia animación de carga
function enviarMenssajes(){
  var contEnviando = document.getElementById('confirmacionEnvio');
  contEnviando.innerHTML = `
  <div class="spinner-border text-primary" 
        id="spinner" role="status">
        <span class="sr-only"></span>
    </div>
    <div id=conteo></div>`;
  eel.enviarMensajes(mainArchivoNombrada)(callbackMensajes)
}

// Gatillada desde python
// Cambia cuenta de mensajes enviados segun argumentos enviados desde python
eel.expose(conteoMensajes);
function conteoMensajes(cuenta,total){
  var contEnviando = document.getElementById('conteo');
  contEnviando.innerHTML = '<div class="card-body">'+'<h5 class="card-title">Progreso: '+cuenta+' de '+total+'</h5>'+'</div>';  
}

// Función callback de resultado asíncrono
// Detiene animación de carga
// Gatilla renderizado de confirmar status de los mensajes enviados
// Agrega resultados a variable global
function callbackMensajes(resultados){
  mainArchivoNombrada = resultados;
  document.getElementById('spinner').style.display = 'none';
  var contEnviando = document.getElementById('conteo');
  contEnviando.innerHTML = ''
  renderizarConfirmarStatus(0);  
}



// Renderiza confirmación de consulta de status
// Puede ser "confirmar status" o "actualizar status", depende del argumento "reset"
// Renderiza el botón "Descargar CSV"
function renderizarConfirmarStatus(reset){
  var contenedorConfirmarVerStatus = document.getElementById('confirmacionEnvio');
  // String Actualizar status
  if(reset=='1'){
    contenedorConfirmarVerStatus.innerHTML = '';
    contenedorConfirmarVerStatus.innerHTML += `
    <div class="card-body"><h5 class="card-title">¿Desea actualizar status de mensajes?</h5>
    <form id="statusForm">
    <input type="button" value="Actualizar" onclick="statusWSP()" class="btn btn-outline-primary">
    </form>
    <br/>
    <button onclick="download_csv()" class="btn btn-outline-success float-end">Descargar CSV</button> 
    </div>`;
  }else{ // String consultar status
    contenedorConfirmarVerStatus.innerHTML += `
    <div class="card-body"><h5 class="card-title">¿Desea consultar status de mensajes?</h5>
    <form id="statusForm">
    <input type="button" value="Consultar" onclick="statusWSP()" class="btn btn-outline-primary">
    </form> 
    </div>`;
  } 
}

// Gatilla funcion de python que consulta estado de mensaje de Whatsappp
// Inicia animación de carga
function statusWSP(){
  var contenedorStatus = document.getElementById('confirmacionEnvio');
  contenedorStatus.innerHTML = '';
  contenedorStatus.innerHTML += `
  <div class="spinner-border text-primary" 
        id="spinner2" role="status">
        <span class="sr-only"></span>
    </div>
    <div id='cuenta_temporal_status'></div>`;
  eel.statusWSP(mainArchivoNombrada)(callbackStatusWSP)
}

// Gatillada desde python
// Cambia cuanta de estados de mensajes recibidos segun argumentos enviados desde python
eel.expose(conteoStatusWSP);
function conteoStatusWSP(cuenta,total){
  var contenedorStatus = document.getElementById('cuenta_temporal_status');
  contenedorStatus.innerHTML = '<div class="card-body">'+'<h5 class="card-title">Progreso: Consultando '+cuenta+' de '+total+'</h5>'+'</div>';
  
}


// Función callback de resultado asíncrono
// Detiene animación de carga
// Gatilla un segundo renderizado de confirmar status de los mensajes enviados (actualizar status)
// Agrega resultados a variables locales
function callbackStatusWSP(resultado){
  statusWSPVar = resultado[0];
  csvData = resultado[1];
  document.getElementById('spinner2').style.display = 'none';
  var contenedorConfirmarVerStatus = document.getElementById('confirmacionEnvio');
  contenedorConfirmarVerStatus.innerHTML ='';
  renderizarConfirmarStatus(1);
}



// Convierte archivo CSV a una lista de diccionarios
// Delimitador = ";"
function csvToArray(str, delimiter = ";") {
    str = str.replace(/\r/g, '');
    // slice from start of text to the first \n index
    // use split to create an array from string by delimiter
    const headers = str.slice(0, str.indexOf("\n")).split(delimiter);

    // slice from \n index + 1 to the end of the text
    // use split to create an array of each csv value row
    const rows = str.slice(str.indexOf("\n") + 1).split("\n");

    // Map the rows
    // split values from each row into an array
    // use headers.reduce to create an object
    // object properties derived from headers:values
    // the object passed as an element of the array
    const arr = rows.map(function (row) {
    const values = row.split(delimiter);
    const el = headers.reduce(function (object, header, index) {
      object[header] = values[index];
      return object;
    }, {});
    return el;
    });

    // return the array
    return arr;
  }




// Funcion que genera CSV desde lista de listas [[fila1],[fila2],...,[filaX]]
// Renderiza botón de descarga del archivo CSV
function download_csv() {
  //[n_persona,msj_enviado,estado(éxito o fracaso),codigo de error, mensaje de error]
    var csv = 'N Persona;Mensaje;Estado;Error;Mensaje Error\n';
    csvData.forEach(function(row) {
            csv += row.join(';');
            csv += "\n";
    });
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'StatusMensajes.csv';
    hiddenElement.click();
}