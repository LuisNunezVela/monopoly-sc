// Clase Propiedad
export class Propiedad {
    constructor(nombre, precioCompra, precioAlquiler) {
        this.nombre = nombre;
        this.precioCompra = precioCompra;
        this.precioAlquiler = precioAlquiler;
    }

    mostrarInfo() {
        console.log(`📍 ${this.nombre}`);
        console.log(`💰 Precio de compra: $${this.precioCompra}`);
        console.log(`🏠 Precio de alquiler: $${this.precioAlquiler}`);
    }
}

// Crear las propiedades y exportarlas
export const propiedades = [
    new Propiedad("Avenida Vermont", 200, 25),
    new Propiedad("Avenida Brasil", 300, 35),
    new Propiedad("Avenida Pedraza", 250, 30),
    new Propiedad("Avenida Murillo", 400, 50),
    new Propiedad("Avenida Banzer", 350, 40),
];
