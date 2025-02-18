
// Clase Propiedad
class Propiedad {
    constructor(nombre, precioCompra, precioAlquiler) {
        this.nombre = nombre;
        this.precioCompra = precioCompra;
        this.precioAlquiler = precioAlquiler;
    }

    // Método para mostrar la información de la propiedad
    mostrarInfo() {
        console.log(`📍 ${this.nombre}`);
        console.log(`💰 Precio de compra: $${this.precioCompra}`);
        console.log(`🏠 Precio de alquiler: $${this.precioAlquiler}`);
    }
}

// Crear las propiedades
const avVermont = new Propiedad("Avenida Vermont", 200, 25);
const avBrasil = new Propiedad("Avenida Brasil", 300, 35);
const avPedraza = new Propiedad("Avenida Pedraza", 250, 30);
const avMurillo = new Propiedad("Avenida Murillo", 400, 50);

// Mostrar información de cada propiedad
avVermont.mostrarInfo();
