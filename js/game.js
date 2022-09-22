'use strict'

//DOM
const MINE_IMG = `<iconify-icon icon="la:bomb" width="20px"></iconify-icon>`
const FLAG_IMG = `<iconify-icon icon="charm:flag" width="20px"></iconify-icon>`
const LOSE_IMG = `<iconify-icon icon="cil:face-dead" width="30px"></iconify-icon>`
const WIN_IMG = `<iconify-icon icon="akar-icons:trophy" width="30px"></iconify-icon>`
const START_IMG = `<iconify-icon icon="bx:happy" width="30px"></iconify-icon>`
const LIFE_IMG = `<iconify-icon inline icon="bi:heart-fill" width="24px"></iconify-icon>`
const HINT_IMG = `<iconify-icon inline icon="academicons:ideas-repec" width="24px" onclick="onHelp('hint')"></iconify-icon>`
const SAFE_IMG = `<iconify-icon inline icon="ion:help-buoy-sharp" width="24px" onclick="onHelp('safe')"></iconify-icon>`
const elStartButton = document.querySelector('.control button')
const elManualButton = document.querySelector('#manual')
const elBest = document.querySelector(`#best-score span`)


// model
const MINE = `*`

var gBoard
var gLevel = null
var gGame = {}
var timerIntervalId
var is7Boom
var isProccessing

// sounds
const WIN_SOUND = new Audio(`/sound/win.wav`)
const LOSE_SOUND = new Audio(`/sound/lose.wav`)
const HINT_SOUND = new Audio(`/sound/hint.wav`)
const SAFE_CLICK = new Audio(`sound/safe_click.wav`)
const MEGA_HINT_SOUND = new Audio(`/sound/mega_hint.wav`)
const ONE_LIFE_DOWN = new Audio(`/sound/one_life_down.wav`)
const UNDO_SOUUND = new Audio(`/sound/undo.wav`)
const EXTERMINATE_SOUND = new Audio(`/sound/exterminate_sound.wav`)



// a new game
function initGame(level = null) {
    clearInterval(timerIntervalId)
    isProccessing = false
    if (!level) return
    
    // sets buttons to start
    renderImg(elStartButton, START_IMG)
    elManualButton.style.visibility = `visible`
    elManualButton.innerText = `position myself`

    //model
    gGame = {
        isOn: false,
        level: level,
        shownCount: 0,
        markedCount: 0,
        secsPassed: 0,
        minePos: [],
        startTime: 0,
        life: 3,
        hint: 3,
        safe: 3,
        stateStack: [],
        isMegaHint: false,
        megaHintFirstPos: null,
        manualPositionOn: false,
        startManually: false
    }

    //DOM
    document.querySelector('.time').innerText = '00 : 00'
    buildBoard()
    renderBoard()

    // disabling right click menu
    const elCells = document.querySelectorAll('.cell')
    for (var i = 0; i < elCells.length; i++) {
        elCells[i].addEventListener("contextmenu", function (e) {
            e.preventDefault()
        })
    }

    // shows how many helps or lives a player has
    renderUtils('life')
    renderUtils('hint')
    renderUtils('safe')
}

// sets level according to user choice
function onSetLevel(level) {
    switch (level) {
        case 'easy':
            gLevel = { SIZE: 4, MINES: 2 }
            break
        case 'medium':
            gLevel = { SIZE: 8, MINES: 14 }
            break
        case 'hard':
            gLevel = { SIZE: 12, MINES: 32 }
            break
        case defualt: return null
    }

    renderValue(elBest, getBestTime(level))
    initGame(level)
}

// builds board and defines cells
function buildBoard() {
    gBoard = []
    for (var i = 0; i < gLevel.SIZE; i++) {
        gBoard[i] = []
        for (var j = 0; j < gLevel.SIZE; j++) {
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
    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
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
    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
            const cellMinesCount = getNegsCountByKey(board, { row: i, col: j }, 'isMine')
            board[i][j].minesAroundCount = cellMinesCount
        }
    }
}

// renders board. DOM only
function renderBoard() {
    const elBoard = document.querySelector(`.board`)
    var strHTML = `<tbody>`
    for (var i = 0; i < gLevel.SIZE; i++) {
        strHTML += `<tr>`
        for (var j = 0; j < gLevel.SIZE; j++) {
            const currCell = gBoard[i][j]
            strHTML += `<td onclick="cellClicked(this, ${i}, ${j})"`
            strHTML += ` oncontextmenu="cellMarked(this, ${i}, ${j})" `
            strHTML += `class="cell " data-row="${i}" data-col="${j}"></td>`
        }
        strHTML += `</tr>`
    }
    strHTML += `</tbody>`
    elBoard.innerHTML = strHTML
}

// stops the game
function gameOver() {
    gGame.isOn = false;
    if (is7Boom) is7Boom = false
    clearInterval(timerIntervalId)
}

// runs when player loses, and they get to see al the mines
function revealAllMines() {
    LOSE_SOUND.play()
    for (var i = 0; i < gGame.minePos.length; i++) {
        const currMineCell = gGame.minePos[i]
        gBoard[currMineCell.row][currMineCell.col].isShown = true
        const elMineCell = getElementByPos(currMineCell.row, currMineCell.col)
        elMineCell.classList.add('mine')
        renderImg(elMineCell, MINE_IMG)
    }
    renderImg(elStartButton, LOSE_IMG)
    gameOver()
}

// if a player loses a life, this function shows the mine they just stepped on, and updates model and DOM
function revealMine(elCell, row, col) {
    ONE_LIFE_DOWN.play()
    gGame.life--
    renderUtils('life')
    gGame.markedCount++
    // gGame.shownCount--
    const mineCell = gBoard[row][col]
    mineCell.isShown = true
    mineCell.isMarked = true
    elCell.classList.add('mine-marked')
    renderImg(elCell, MINE_IMG)
}

// runs after each click
function checkGameOver() {
    if (gGame.markedCount + gGame.shownCount === gLevel.SIZE ** 2 &&
        gGame.markedCount === gGame.minePos.length) {
        setBestTime(gGame.level)
        renderValue(elBest, getBestTime(gGame.level))
        renderImg(elStartButton, WIN_IMG)
        gGame.stateStack = null
        WIN_SOUND.play()
        gameOver()
    }
}

// if user seeks help, they can chooes safe click of hint click
// user can choose a hint, and get a bunch of cells view for a second
// user can choose a safe click which shows a safe cell for a couple if seconds
// user can choose a mega hint, and then this  function  runs like a very large 'hint'
function onHelp(util, firstPos = null, secondPos = null) {
    if (!gGame.isOn) return
    saveCurrState()
    //
    if (!gGame.isMegaHint) {
        if (util === 'hint') HINT_SOUND.play()
        else SAFE_CLICK.play()
        gGame[util]--
    } else MEGA_HINT_SOUND.play()
    isProccessing = true // to save user from clicking before DOM reders back to normal


    if (!gGame.isMegaHint) renderUtils(util) // random position only

    const positions = getSearchPosition(util, firstPos, secondPos)

    // hint duration
    var renderTime
    if (gGame.isMegaHint) renderTime = 2000
    else renderTime = (util === 'hint') ? 1000 : 4000

    // revealing cells according to choice
    for (var i = positions.start.row; i <= positions.end.row; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = positions.start.col; j <= positions.end.col; j++) {
            if (j < 0 || j > gLevel.SIZE - 1) continue
            const currCell = gBoard[i][j]
            const elCell = getElementByPos(i, j)
            
            if (gGame.isMegaHint && !currCell.isMine) elCell.classList.add('mega-hint-cell')
            if (currCell.isMine) {
                renderImg(elCell, MINE_IMG)
                elCell.classList.add('mine')
            }
            else renderValue(elCell, currCell.minesAroundCount)
            setTimeout(() => {
                elCell.classList.remove('mega-hint-cell')
                elCell.classList.remove('mine')
                if (!currCell.isShown) {
                    renderValue(elCell, '')
                } else {
                    if (currCell.isMarked) renderImg(elCell, FLAG_IMG)
                    else if (currCell.isUnkown) renderValue(elCell, '?')
                    else if (!currCell.isShown) renderValue(elCell, '')
                    if (currCell.isMine && currCell.isShown) renderImg(elCell, MINE_IMG)
                }
                isProccessing = false
            }, renderTime)
        }
    }
}


// turning 7 boom mode on start
function onSevenBoom() {
    is7Boom = true;
    initGame(true)

    for (var i = 0; i < gLevel.SIZE; i++) {
        for (var j = 0; j < gLevel.SIZE; j++) {
            const currIdx = i * gLevel.SIZE + j
            if (!(currIdx % 7) ||
                parseInt(currIdx / 10) === 7 ||
                currIdx % 10 === 7) {
                gGame.minePos.push({ row: i, col: j })
                gBoard[i][j].isMine = true;
            }
        }
    }
    setMinesNegsCount(gBoard)
    gGame.isOn = true
    gGame.startTime = Date.now()
    timerIntervalId = setInterval(renderTime, 1000)
}

// updates model about mega hint state
function onMegaHint() {
    if (!gGame.isOn || gGame.isMegaHint || gGame.megaHintFirstPos) return
    gGame.isMegaHint = true
}

//uses get help and its searchCells utility to show a mega hint
function showMegaHint(firstPos, secondPos) {
    if (firstPos.row < secondPos.row &&
        firstPos.col > secondPos.col ||
        (firstPos.row === secondPos.row &&
            firstPos.col === secondPos.col)) {
        const elFirstCell = getElementByPos(firstPos.row, firstPos.col)
        const elSecondCell = getElementByPos(secondPos.row, secondPos.col)
        elFirstCell.classList.remove('mega-hint-cell')
        elSecondCell.classList.remove('mega-hint-cell')
        gGame.megaHintFirstPos = null
        gGame.isMegaHint = false
        return
    }
    onHelp('hint', firstPos, secondPos)
    gGame.isMegaHint = false

}