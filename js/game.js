'use strict'

//DOM
const MINE_IMG = `<iconify-icon icon="la:bomb" width="20"></iconify-icon>`
const FLAG_IMG = `<iconify-icon icon="charm:flag" width="20"></iconify-icon>`
const LOSE_IMG = `<iconify-icon icon="cil:face-dead" width="20"></iconify-icon>`
const WIN_IMG = `<iconify-icon icon="akar-icons:trophy" width="30"></iconify-icon>`
const START_IMG = `<iconify-icon icon="bx:happy" width="30"></iconify-icon>`
const LIFE_IMG = `<iconify-icon inline icon="bi:heart-fill" width="20"></iconify-icon>`
const HINT_IMG = `<iconify-icon inline icon="academicons:ideas-repec" width="20" onclick="onHelp('hint')"></iconify-icon>`
const SAFE_IMG = `<iconify-icon inline icon="ion:help-buoy-sharp" width="20" onclick="onHelp('safe')"></iconify-icon>`
const elButton = document.querySelector('.control button')

// model
const MINE = `*`

var gBoard
var gLevel = {
    SIZE: 12,
    MINES: 32
}
var gGame = {}
var timerIntervalId

// renders a happy face
renderImg(elButton, START_IMG)


// a new game
function initGame() {
    
    //model
    gGame = {
        isOn: false,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0,
        minePos: [],
        startTime: 0,
        life: 3,
        hint: 3,
        safe: 3,
        SIZE: gLevel.SIZE
    }
    
    //DOM
    clearInterval(timerIntervalId)
    document.querySelector('.time').innerText = '00 : 00'

    buildBoard()
    renderBoard(gBoard)

    const elCells = document.querySelectorAll('.cell')
    for (var i = 0; i < elCells.length; i++) {
        elCells[i].addEventListener("contextmenu", function (e) {
            e.preventDefault()
        })
    }
    renderUtils('life')
    renderUtils('hint')
    renderUtils('safe')
}

// builds board and defines cells
function buildBoard() {
    gBoard = []
    for (var i = 0; i < gGame.SIZE; i++) {
        gBoard[i] = []
        for (var j = 0; j < gGame.SIZE; j++) {
            gBoard[i][j] = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false,
                isUnkown: false
            }
        }
    }
}

// positions mines randomlly. model only
function getRandomMinesPos(firstPos) {
    var mines = []
    for (var i = 0; i < gGame.SIZE; i++) {
        for (var j = 0; j < gGame.SIZE; j++) {
            if (firstPos.row === i && firstPos.col === j) continue
            mines.push({ row: i, col: j })
        }
    }
    for (var i = 0; i < gLevel.MINES; i++) {
        const randomMineIdx = getRandomInt(0, mines.length)
        const randomMine = mines.splice(randomMineIdx, 1)[0]

        gGame.minePos.push({ row: randomMine.row, col: randomMine.col })
        gBoard[randomMine.row][randomMine.col].isMine = true

    }
    
    setMinesNegsCount(gBoard)
}

// sets each cell with proper data. model only
function setMinesNegsCount(board) {
    for (var i = 0; i < gGame.SIZE; i++) {
        for (var j = 0; j < gGame.SIZE; j++) {
            const cellMinesCount = getNegsCountByKey(board, { row: i, col: j }, 'isMine')
            board[i][j].minesAroundCount = cellMinesCount
        }
    }
}

// renders board. DOM only
function renderBoard(board) {
    const elBoard = document.querySelector(`.board`)
    var strHTML = `<tbody>`
    for (var i = 0; i < gGame.SIZE; i++) {
        strHTML += `<tr>`
        for (var j = 0; j < gGame.SIZE; j++) {
            strHTML += `<td onclick="cellClicked(this, ${i}, ${j})"`
            strHTML += ` oncontextmenu="cellMarked(this, ${i}, ${j})"`
            strHTML += ` class="cell" data-row="${i}" data-col="${j}"></td>`
        }
        strHTML += `</tr>`
    }
    strHTML += `</tbody>`
    elBoard.innerHTML = strHTML
}

// stops the game
function gameOver() {
    gGame.isOn = false;
    clearInterval(timerIntervalId)
}

// runs when player loses, and they get to see al the mines
function revealAllMines() {
    for (var i = 0; i < gGame.minePos.length; i++) {
        const currMineCell = gGame.minePos[i]
        gBoard[currMineCell.row][currMineCell.col].isShown = true
        const elMineCell = getElementByPos(currMineCell.row, currMineCell.col)
        elMineCell.classList.add('mine')
        renderImg(elMineCell, MINE_IMG)
    }
    renderImg(elButton, LOSE_IMG)
    gameOver()
}

// if a player loses a life, this function shows the mine they just stepped on, and updates model and DOM
function revealMine(elCell, row, col) {
    gGame.life--
    renderUtils('life')
    gGame.markedCount++
    const mineCell = gBoard[row][col]
    mineCell.isShown = true
    mineCell.isMarked = true
    elCell.classList.add('mine-marked')
    renderImg(elCell, MINE_IMG)
}

// runs after each click
function checkGameOver() {
    if (gGame.markedCount + gGame.shownCount === gGame.SIZE * gGame.SIZE) {
        renderImg(elButton, WIN_IMG)
        gameOver()
    }
}

// if user seeks help, they can chooes safe click of hint click
function onHelp(util) {
    if (!gGame.isOn) return
    gGame[util]--
    renderUtils(util)
    const hiddenCell = getRandomHiddenCell(gBoard, util === 'hint')
    const row = hiddenCell.row
    const col = hiddenCell.col
    const startRowIdx = (util === 'hint') ? row - 1 : row
    const startColIdx = (util === 'hint') ? col - 1 : col
    const endRowIdx = (util === 'hint') ? row + 1 : row
    const endColIdx = (util === 'hint') ? col + 1 : col

    const renderTime = (util === 'hint') ? 1000 : 4000
    for (var i = startRowIdx; i <= endRowIdx; i++) {
        if (i < 0 || i > gGame.SIZE - 1) continue
        for (var j = startColIdx; j <= endColIdx; j++) {
            if (j < 0 || j > gGame.SIZE - 1) continue
            const currCell = gBoard[i][j]
            const elCell = getElementByPos(i, j)
            if (currCell.isMine) renderImg(elCell, MINE_IMG)
            else renderValue(elCell, currCell.minesAroundCount)
            setTimeout(() => {
                if (!currCell.isShown) {
                    elCell.style.opacity = 0
                }
            }, renderTime);
            setTimeout(() => {
                if (!currCell.isShown) {
                    elCell.style.opacity = 1
                    renderValue(elCell, '')
                }

            }, renderTime + 600)
        }
    }
}