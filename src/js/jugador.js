const player1 = {
    name: "Jugador 1",
    position: 0,  // Casilla actual en el tablero
    money: 1500,  // Dinero inicial
    properties: [], // Lista de propiedades que posee
    inJail: false,  // Estado si está en la cárcel
};

function movePlayer(player, diceRoll) {
    player.position += diceRoll;

    // Si pasa la casilla de salida (suponiendo que hay 40 casillas)
    if (player.position >= casillas.length) {
        player.position -= casillas.length; // Reinicia en la casilla 0
        player.money += 200; // Recibe dinero por pasar por salida
        console.log(`${player.name} pasó por salida y recibió $200.`);
    }

    console.log(`${player.name} ahora está en la casilla ${player.position}`);

    // Mueve la ficha del jugador en Three.js
    animatePlayerMovement(playerMesh, player.position);
}

function animatePlayerMovement(playerMesh, targetIndex) {
    const targetPosition = casillas[targetIndex].position;

    const animationDuration = 1000; // 1 segundo
    const startTime = Date.now();
    const startPos = playerMesh.position.clone();

    function animate() {
        const elapsedTime = Date.now() - startTime;
        const t = Math.min(elapsedTime / animationDuration, 1); // Progresión de la animación (0 a 1)

        // Interpolación de la posición
        playerMesh.position.lerpVectors(startPos, targetPosition, t);

        if (t < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}