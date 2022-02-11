// Script que escucha el evento del botón "Procesar Archivo"
// Convierte archivo csv a una lista de diccionarios

const formularioNombrada = document.getElementById("archivoNombradaForm");
const archivoNombrada = document.getElementById("archivoNombrada");

formularioNombrada.addEventListener("submit", function (e) {
    e.preventDefault();
    const input = archivoNombrada.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const data = csvToArray(text);
        nombradaCSV = JSON.parse(JSON.stringify(data))
        
        consultarContactos(data);
    }
    reader.readAsText(input);
    
});