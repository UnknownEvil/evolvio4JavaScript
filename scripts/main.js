function main() {
	render();

	if (population < creatureLimit) {
		let odate = new Date();
		if (timescale >= 1) { // Can timescale ever go below 1?
			for (let ts = 0; ts < timescale; ts++) {
				update();
			}
		} else {
			tc++;
			if (tc >= 1 / timescale) {
				update();

				tc = 0;
			}
		}

		let ndate = new Date();
		if (ndate - odate > maxUpdateTime && !fastforward && autoMode && timescale > 1) {
			timescale--;
		} else if (ndate - odate < minUpdateTime && !fastforward && autoMode) {
			timescale++;
		}
	}
}

function update() {
	tick++;

	if (season === 0) {
		seasonUp = true;
		year++;
	} else if (season == growSeasonLength + dieSeasonLength) {
		seasonUp = false;
	}

	if (seasonUp) season++;
	else season--;

	if (season % mapUpdateDelay === 0 && population < foodImposedCreatureLimit) {
		for (let row = 0; row < mapSize; row++) {
			for (let column = 0; column < mapSize; column++) {
				let tile = map[row][column];
				if (tile.type > 0) {
					if (season < growSeasonLength) {
						tile.food += growSeasonGrowRate * mapUpdateDelay; // * (tile.food / tile.maxFood + Number.EPSILON);
					} else if (tile.type == 1) {
						tile.food += dieSeasonGrowRate * mapUpdateDelay; // * (tile.food / tile.maxFood + Number.EPSILON);
					}

					if (tile.food > tile.maxFood) tile.food = tile.maxFood;
					else if (tile.food < 0) tile.food = 0;
				}
			}
		}
	}

	for (let i = 0; i < population; i++) {
		wallLock(creatures[i]);
	}

	firstGen = 0;
	for (let i = 0; i < population; i++) {
		let creature = creatures[i];
		if (creature.age > oldest) oldest = creature.age;
		if (creature.speciesGeneration === 0) firstGen++;

		let time = (tick % 10) / 10;
		let rotation = creature.rotation / 6.28318; // 2 * 3.14159 (PI)
		let energy = creature.energy / creatureEnergy;
		let age = creature.age / metabolismScaleTime;

		let pos = creature.getPosition();
		let tile = map[pos[0]][pos[1]];

		let x = pos[0] / mapSize;
		let y = pos[1] / mapSize;

		creature.input = [time, rotation, energy, age, x, y];

		let vision = creature.see();
		for (let i = 0; i < vision.length; i++) {
			creature.input.push(vision[i]);
		}

		creature.output = creature.feedForward(creature.input);

		creature.act();

		creature.energyGraph.net.push(creature.energy - creature.lastEnergy);
		creature.energyGraph.gross.push(creature.energy);

		creature.lastEnergy = creature.energy;

		if (zoomLevel >= 0.05 && creature == selectedCreature) {
			cropx -= (cropx - (creature.x * zoomLevel - canvas.width / 2)) / ((1 / panSpeed) / zoomLevel);
			cropy -= (cropy - (creature.y * zoomLevel - canvas.height / 2)) / ((1 / panSpeed) / zoomLevel);
		}
	}

	for (let i = population - 1; i >= 0; i--) {
		clampSize(creatures[i]);
	}
}

function wallLock(creature) {
	if (creature.x < 0) {
		creature.x = 1;
	} else if (creature.x >= mapSize * tileSize) {
		creature.x = mapSize * tileSize - 1;
	}

	if (creature.y < 0) {
		creature.y = 1;
	} else if (creature.y >= mapSize * tileSize) {
		creature.y = mapSize * tileSize - 1;
	}
}

function clampSize(creature) {
	if (creature.energy > creatureEnergy) creature.energy = creatureEnergy;
	if (creature.energy <= 0) {
		if (creature == selectedCreature) selectedCreature = null;
		creature.die();
	}
}

let maxTileFoodOverHundred = maxTileFood / 100;
let multiple = tileSize * zoomLevel;

function render() {
	renderClear();
	renderTiles();
	renderOutline();
	renderCreatures();
	renderUI();
	renderSelectedCreature();
}

function renderClear() {
	ctx.clearRect(0, 0, display.width, display.height);
	ctz.clearRect(0, 0, viewport.width, viewport.height);
}

function renderTiles() {
	let hue = (60 - (season - growSeasonLength) / (growSeasonLength + dieSeasonLength) * 40);
	let huePrefix = "hsl(" + hue + ", ";

	for (let row = 0; row < mapSize; row++) {
		for (let column = 0; column < mapSize; column++) {
			let tile = map[row][column];
			if (tile.type > 0) {
				let saturation = Math.floor(tile.food / maxTileFoodOverHundred);

				if (tile.type == 1) ctx.fillStyle = huePrefix + saturation + "%, 20%)";
				else ctx.fillStyle = "hsl(145, " + saturation + "%, 18%)";
				ctx.fillRect(row * multiple - cropx, column * multiple - cropy, multiple + 1, multiple + 1);
			}
		}
	}
}

function renderOutline() {
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 15 * zoomLevel;

	ctx.beginPath();

	for (let i = 0; i < olength; i++) {
		ctx.moveTo(outline[i][0] * zoomLevel - cropx, outline[i][1] * zoomLevel - cropy);
		ctx.lineTo(outline[i][2] * zoomLevel - cropx, outline[i][3] * zoomLevel - cropy);
	}

	ctx.stroke();
}

function renderCreatures() {
	for (let i = 0; i < population; i++) {
		let creature = creatures[i];
		let creaturex = creature.x * zoomLevel;
		let creaturey = creature.y * zoomLevel;

		if (creature.output[3] >= minAttackPower) {
			ctx.fillStyle = "rgba(255, 0, 0, " + creature.output[3] + ")";

			let pos = [Math.floor((creature.x + Math.cos(creature.rotation) * tileSize) / tileSize), Math.floor((creature.y + Math.sin(creature.rotation) * tileSize) / tileSize)];
			ctx.fillRect(pos[0] * zoomLevel * tileSize - cropx, pos[1] * zoomLevel * tileSize - cropy, tileSize * zoomLevel, tileSize * zoomLevel);
		}

		ctx.lineWidth = 10 * zoomLevel;

		ctx.fillStyle = creature.color;
		ctx.fillCircle(creaturex - cropx, creaturey - cropy, creature.size * zoomLevel, true);

		ctx.beginPath();
		ctx.moveTo(creaturex - cropx, creaturey - cropy);
		ctx.lineTo(creaturex + Math.cos(creature.rotation) * (creature.size + 75) * zoomLevel - cropx, creaturey - cropy + Math.sin(creature.rotation) * (creature.size + 75) * zoomLevel);
		ctx.stroke();

		if (infoMode) {
			ctx.beginPath();
			ctx.moveTo(creaturex - cropx + Math.cos(creature.rotation) * creature.size * zoomLevel, creaturey - cropy + Math.sin(creature.rotation) * creature.size * zoomLevel);
			ctx.lineTo(creaturex - cropx + Math.cos(creature.rotation + Math.PI / 2) * (creature.size - 3) * creature.network.output[1] * zoomLevel, creaturey - cropy + Math.sin(creature.rotation + Math.PI / 2) * (creature.size - 3) * creature.network.output[1] * zoomLevel);
			ctx.stroke();
		}

		if (debugMode) {
			ctx.lineWidth = 2 * zoomLevel;

			let eyes = creature.eyes.length;
			for (let i = 0; i < eyes; i++) {
				let eye = creature.eyes[i];
				ctx.beginPath();
				ctx.moveTo(creaturex - cropx, creaturey - cropy);
				ctx.lineTo(creaturex - cropx + Math.cos(creature.rotation + eye.angle) * eye.distance * zoomLevel, creaturey - cropy + Math.sin(creature.rotation + eye.angle) * eye.distance * zoomLevel);
				ctx.stroke();

				ctx.fillCircle(creaturex - cropx + Math.cos(creature.rotation + eye.angle) * eye.distance * zoomLevel, creaturey - cropy + Math.sin(creature.rotation + eye.angle) * eye.distance * zoomLevel, 15 * zoomLevel, true);
			}
		}
	}
}

function renderUI() {
	ctz.textAlign = "center";
	ctz.fillStyle = "#ffffff";
	ctz.strokeStyle = "#000000";
	ctz.font = "48px Calibri";
	ctz.lineWidth = 5;

	let yearProgress = seasonUp ? season / (growSeasonLength + dieSeasonLength) / 2 : 1 - (season / (growSeasonLength + dieSeasonLength) / 2);
	ctz.strokeText("Year " + (year + yearProgress).toFixed(1), 1920 / 2, 50);
	ctz.fillText("Year " + (year + yearProgress).toFixed(1), 1920 / 2, 50);

	ctz.textAlign = "left";
	ctz.strokeText("Population: " + population, 40, 1040);
	ctz.fillText("Population: " + population, 40, 1040);

	ctz.textAlign = "right";
	ctz.strokeText((timescale < 1 ? timescale.toFixed(1) : Math.ceil(timescale)) + "x", 1880, 1040);
	ctz.fillText((timescale < 1 ? timescale.toFixed(1) : Math.ceil(timescale)) + "x", 1880, 1040);

	ctz.textAlign = "center";

	if (infoMode) {
		ctz.font = zoomLevel * 128 + "px Calibri";

		let tilex = Math.floor((mouse.current.x + cropx) / tileSize / zoomLevel);
		let tiley = Math.floor((mouse.current.y + cropy) / tileSize / zoomLevel);
		if (tilex >= 0 && tilex < mapSize && tiley >= 0 && tiley < mapSize) {
			ctz.strokeText(map[tilex][tiley].food.toFixed(1), tilex * tileSize * zoomLevel - cropx + tileSize / 2 * zoomLevel, tiley * tileSize * zoomLevel - cropy + tileSize / 1.5 * zoomLevel);
			ctz.fillText(map[tilex][tiley].food.toFixed(1), tilex * tileSize * zoomLevel - cropx + tileSize / 2 * zoomLevel, tiley * tileSize * zoomLevel - cropy + tileSize / 1.5 * zoomLevel);

			ctz.beginPath();
			ctz.strokeStyle = "#ffffff";
			ctz.lineWidth = 2;
			ctz.rect(tilex * tileSize * zoomLevel - cropx, tiley * tileSize * zoomLevel - cropy, tileSize * zoomLevel + 2, tileSize * zoomLevel + 2);
			ctz.stroke();
		}
	}
}

function renderSelectedCreature() {
	if (selectedCreature !== null) {
		ctz.font = "32px Calibri";
		ctz.lineWidth = 10 * zoomLevel;

		ctz.strokeStyle = "#ffffff"
		ctz.beginPath();
		ctz.moveTo(selectedCreature.x * zoomLevel - cropx + Math.cos(selectedCreature.rotation) * selectedCreature.size * zoomLevel, selectedCreature.y * zoomLevel - cropy + Math.sin(selectedCreature.rotation) * selectedCreature.size * zoomLevel);
		ctz.lineTo(selectedCreature.x * zoomLevel - cropx + Math.cos(selectedCreature.rotation + Math.PI / 2) * (selectedCreature.size - 3) * selectedCreature.network.output[1] * zoomLevel, selectedCreature.y * zoomLevel - cropy + Math.sin(selectedCreature.rotation + Math.PI / 2) * (selectedCreature.size - 3) * selectedCreature.network.output[1] * zoomLevel);
		ctz.stroke();

		ctz.strokeStyle = "#ff8888";
		ctz.beginPath();
		ctz.moveTo(selectedCreature.x * zoomLevel - cropx, selectedCreature.y * zoomLevel - cropy);
		ctz.lineTo(selectedCreature.x * zoomLevel - cropx + Math.cos(selectedCreature.rotation) * (selectedCreature.size + 90) * zoomLevel, selectedCreature.y * zoomLevel - cropy + Math.sin(selectedCreature.rotation) * (selectedCreature.size + 90) * zoomLevel);
		ctz.stroke();

		ctz.fillStyle = "#222222";
		ctz.strokeStyle = "hsl(0, 0%, 100%)";

		ctx.lineWidth = 2 * zoomLevel;
		ctx.fillStyle = selectedCreature.color;

		for (let eye of selectedCreature.eyes) {
			ctx.beginPath();
			ctx.moveTo(selectedCreature.x * zoomLevel - cropx, selectedCreature.y * zoomLevel - cropy);
			ctx.lineTo(selectedCreature.x * zoomLevel - cropx + Math.cos(selectedCreature.rotation + eye.angle) * eye.distance * zoomLevel, selectedCreature.y * zoomLevel - cropy + Math.sin(selectedCreature.rotation + eye.angle) * eye.distance * zoomLevel);
			ctx.stroke();

			ctx.fillCircle(selectedCreature.x * zoomLevel - cropx + Math.cos(selectedCreature.rotation + eye.angle) * eye.distance * zoomLevel, selectedCreature.y * zoomLevel - cropy + Math.sin(selectedCreature.rotation + eye.angle) * eye.distance * zoomLevel, 15 * zoomLevel, true);
		}

		ctz.lineWidth = 3;

		if (infoMode) {
			for (let j = 0; j < selectedCreature.network.forget.neurons[0].length; j++) {
				ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 14, j * (nnui.size * 2 + 5) + nnui.yoffset, nnui.size, nnui.stroke);
			}

			for (let j = 0; j < selectedCreature.network.forget.neurons[selectedCreature.network.forget.neurons.length - 1].length; j++) {
				ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 10, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
			}

			for (let j = 0; j < selectedCreature.network.decide.neurons[selectedCreature.network.decide.neurons.length - 1].length; j++) {
				ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 8, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
			}

			for (let j = 0; j < selectedCreature.network.modify.neurons[selectedCreature.network.modify.neurons.length - 1].length; j++) {
				ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 6, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
			}

			for (let j = 0; j < selectedCreature.network.main.neurons[selectedCreature.network.main.neurons.length - 1].length; j++) {
				ctz.fillCircle(nnui.xoffset - (nnui.size + 5) * 3, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
			}

			for (let i = 0; i < selectedCreature.network.cellState.length; i++) {
				ctz.fillCircle(1920 - 60, i * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset, nnui.size, nnui.stroke);
			}

			ctz.lineWidth = 2;

			ctz.strokeStyle = "#ffffff";
			let x = 0;
			ctz.beginPath();
			for (let point of selectedCreature.energyGraph.gross) {
				if (x * 10 >= 1400) selectedCreature.energyGraph.gross.splice(0, 1);
				ctz.lineTo(x * 10, 900 - point * graphMult / 10);
				x++;
			}
			ctz.stroke();

			ctz.strokeStyle = "#aaffff";
			x = 0;
			ctz.beginPath();
			for (let point of selectedCreature.energyGraph.net) {
				if (x * 10 >= 1400) selectedCreature.energyGraph.net.splice(0, 1);
				ctz.lineTo(x * 10, 900 - point * graphMult);
				x++;
			}
			ctz.stroke();

			ctz.strokeStyle = "#ffaa00";
			x = 0;
			ctz.beginPath();
			for (let point of selectedCreature.energyGraph.metabolism) {
				if (x * 10 >= 1400) selectedCreature.energyGraph.metabolism.splice(0, 1);
				ctz.lineTo(x * 10, 900 - point * graphMult);
				x++;
			}
			ctz.stroke();

			ctz.strokeStyle = "#ff2233";
			x = 0;
			ctz.beginPath();
			for (let point of selectedCreature.energyGraph.attack) {
				if (x * 10 >= 1400) selectedCreature.energyGraph.attack.splice(0, 1);
				ctz.lineTo(x * 10, 900 - point * graphMult);
				x++;
			}
			ctz.stroke();

			ctz.strokeStyle = "#aa88ff";
			x = 0;
			ctz.beginPath();
			for (let point of selectedCreature.energyGraph.move) {
				if (x * 10 >= 1400) selectedCreature.energyGraph.move.splice(0, 1);
				ctz.lineTo(x * 10, 900 - point * graphMult);
				x++;
			}
			ctz.stroke();

			ctz.strokeStyle = "#00ff00";
			x = 0;
			ctz.beginPath();
			for (let point of selectedCreature.energyGraph.eat) {
				if (x * 10 >= 1400) selectedCreature.energyGraph.eat.splice(0, 1);
				ctz.lineTo(x * 10, 900 - point * graphMult);
				x++;
			}
			ctz.stroke();

			ctz.strokeStyle = "#000000";
			ctz.beginPath();
			ctz.moveTo(0, 900);
			ctz.lineTo(1400, 900);
			ctz.stroke();

			ctz.strokeStyle = "#000000";
			ctz.fillStyle = "#ffffff";

			ctz.textAlign = "left";
			ctz.strokeText(selectedCreature.species, 20, 1080 - 20);
			ctz.fillText(selectedCreature.species, 20, 1080 - 20);
			ctz.textAlign = "center";

			ctz.strokeText("Cell State", 1920 - 60, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);

			ctz.strokeText("Move", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);
			ctz.strokeText("Turn", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 1 - nnui.size - 12);
			ctz.strokeText("Eat", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 2 - nnui.size - 12);
			ctz.strokeText("Attack", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 3 - nnui.size - 12);
			ctz.strokeText("Reproduce", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 4 - nnui.size - 12);

			for (let i = 0; i < memories; i++) {
				ctz.strokeText("Mem. " + i, nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * (i + 5) - nnui.size - 12);
			}

			ctz.fillText("Cell State", 1920 - 60, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);

			ctz.fillText("Move", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 0 - nnui.size - 12);
			ctz.fillText("Turn", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 1 - nnui.size - 12);
			ctz.fillText("Eat", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 2 - nnui.size - 12);
			ctz.fillText("Attack", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 3 - nnui.size - 12);
			ctz.fillText("Reproduce", nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * 4 - nnui.size - 12);

			for (let i = 0; i < memories; i++) {
				ctz.fillText("Mem. " + i, nnui.xoffset - nnui.size * 10, nnui.yoffset + (nnui.size * 2 + nnui.yspacing) * (i + 5) - nnui.size - 12);
			}

			ctz.font = "bold 21px Calibri";

			for (let j = 0; j < selectedCreature.network.forget.neurons[0].length; j++) {
				ctz.fillText(selectedCreature.network.forget.neurons[0][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 14, j * (nnui.size * 2 + 5) + nnui.yoffset + 6);
			}

			for (let j = 0; j < selectedCreature.network.forget.neurons[selectedCreature.network.forget.neurons.length - 1].length; j++) {
				ctz.fillText(selectedCreature.network.forget.neurons[selectedCreature.network.forget.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 10, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
			}

			for (let j = 0; j < selectedCreature.network.decide.neurons[selectedCreature.network.decide.neurons.length - 1].length; j++) {
				ctz.fillText(selectedCreature.network.decide.neurons[selectedCreature.network.decide.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 8, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
			}

			for (let j = 0; j < selectedCreature.network.modify.neurons[selectedCreature.network.modify.neurons.length - 1].length; j++) {
				ctz.fillText(selectedCreature.network.modify.neurons[selectedCreature.network.modify.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 6, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
			}

			for (let j = 0; j < selectedCreature.network.main.neurons[selectedCreature.network.main.neurons.length - 1].length; j++) {
				ctz.fillText(selectedCreature.network.main.neurons[selectedCreature.network.main.neurons.length - 1][j].toFixed(1), nnui.xoffset - (nnui.size + 5) * 3, j * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
			}

			for (let i = 0; i < selectedCreature.network.cellState.length; i++) {
				ctz.fillText(selectedCreature.network.cellState[i].toFixed(1), 1920 - 60, i * (nnui.size * 2 + nnui.yspacing) + nnui.yoffset + 6);
			}
		}
	}
}