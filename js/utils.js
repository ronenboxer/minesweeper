'use strict'

// same old
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

// toggels betwwn mute and unmute modes
function onMute(elButton) {
    elButton.classList.toggle('mute')
    isMute = !isMute
}

// updates DOM about amount of mines / flags to place
function renderFlagsLeft() {
    const flagsLeft = gGame.minePos.length - gGame.markedCount
    renderValue(EL_FLAGS_LEFT, flagsLeft)
    if (flagsLeft < 0) EL_FLAGS_LEFT.classList.add('flags-too-many')
    else EL_FLAGS_LEFT.classList.remove('flags-too-many')
}

// returns the number of neighbours that has a certain key (such as: isMines, isMarked etc)
function getNegsCountByKey(board, pos, key) {
    var count = 0
    for (var i = pos.row - 1; i <= pos.row + 1; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = pos.col - 1; j <= pos.col + 1; j++) {
            if (j < 0 || j > gLevel.SIZE - 1 ||
                (j === pos.col && i === pos.row)) continue

            // if a cell is unknown and function run to look for mraked cells,
            // function quits and returns -1
            if (key === 'isMarked' && board[i][j].isUnknown) return -1
            if (board[i][j][key]) count++
        }
    }
    return count
}

// shows all neighours of a cell but the cell itslef
function showAllNegs(board, row, col) {
    for (var i = row - 1; i <= row + 1; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = col - 1; j <= col + 1; j++) {
            const currCell = board[i][j]
            if (j < 0 || j > gLevel.SIZE - 1 ||
                (j === col && i === row) ||
                currCell.isMarked ||
                currCell.isUnknown ||
                currCell.isShown) continue // no showing marked or already shown cells
            const elCell = getElementByPos(i, j)
            if (currCell.isMine) revealMine(elCell, i, j) // if player landed on mine
            else stepOnCell(board, elCell, i, j) // if they landed on a safe cell

            // if this cell has mined neighbours we updtae DOM. // else we expand
            if (currCell.minesAroundCount && !currCell.isMine) {
                renderValue(elCell, currCell.minesAroundCount)
            } else expandShown(board, elCell, i, j)
        }
    }
}



// returns cell element
function getElementByPos(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`)
}



// to render strings - DOM
function renderValue(element, value) {
    element.innerText = value
}



// to render imgs - DOM
function renderImg(element, img) {
    element.innerHTML = img
}



// shows user play time
function renderTime() {
    const currTime = Date.now() - gGame.startTime
    var seconds = parseInt(currTime / 1000)
    gGame.secsPassed = seconds
    seconds %= 60
    var minutes = parseInt(currTime / 60000)
    if (seconds < 10) seconds = '0' + seconds
    if (minutes < 10) minutes = '0' + minutes
    const elTime = document.querySelector('#time span')
    elTime.innerText = minutes + ' : ' + seconds
}




// adds/removes a `utiliy` from DOM (such as life, hint click or safe click)
function renderUtils(util) {
    const elUtility = document.querySelector(`[id="${util}"] span`)
    var imgStr = ''
    for (var i = 0; i < gGame[util]; i++) {
        switch (util) {
            case 'life':
                imgStr += LIFE_IMG
                break
            case 'hint':
                imgStr += HINT_IMG
                break
            case 'safe':
                imgStr += SAFE_IMG
                break
            case 'mega':
                imgStr += MEGA_HINT_IMG
                break
            case 'exterminate':
                imgStr += EXTERMINATE_IMG
                break
        }
    }
    renderImg(elUtility, imgStr)
}



// returns a random HIDDEN cell
function getRandomHiddenCell(board) {
    var positions = []
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (!board[i][j].isShown && !board[i][j].isMine) positions.push({ row: i, col: j })
        }
    }
    var randomIdx = getRandomInt(0, positions.length)
    return positions.splice(randomIdx, 1)[0]
}



// saves best time on local sotrage - model
function setBestTime(level) {
    const currBestTime = +localStorage.getItem(`best ${level}`)
    if (!currBestTime || gGame.secsPassed < currBestTime) localStorage.setItem(`best ${level}`, gGame.secsPassed)
}



// calculates best time and renders - DOM
function getBestTime(level) {
    const currBestTime = +localStorage.getItem(`best ${level}`)
    if (!currBestTime) return ''
    var seconds = currBestTime % 60
    gGame.secsPassed = seconds
    if (seconds < 10) seconds = '0' + seconds
    var minutes = parseInt(currBestTime / 60)
    if (minutes < 10) minutes = '0' + minutes
    if (!minutes) minutes = '00'
    return minutes + ' : ' + seconds
}



// stacks relevant data to gGame.stateStack for undo
function saveCurrState() {
    const lastBoard = JSON.stringify(gBoard)

    const lastGame = {
        level: gGame.level,
        shownCount: gGame.shownCount,
        markedCount: gGame.markedCount,
        minePos: JSON.stringify(gGame.minePos),
        life: gGame.life,
        hint: gGame.hint,
        safe: gGame.safe,
        mega: gGame.mega,
        exterminate: gGame.exterminate,
        isMegaHintOn: gGame.isMegaHintOn
    }
    // JSON.stringify(gGame)

    gGame.stateStack.push({
        board: lastBoard,
        game: lastGame,
        elGameArea: document.querySelector('.game-area').innerHTML
    })
}



// pops the last state and renders it
function restoreLastState() {
    if (!gGame.stateStack || !gGame.stateStack.length || !gGame.isOn) return
    if (!isMute) playUtilSound('undo')
    const lastState = gGame.stateStack.pop()
    gBoard = JSON.parse(lastState.board)
    document.querySelector('.game-area').innerHTML = lastState.elGameArea
    gGame = {
        isOn: true,
        level: lastState.game.level,
        shownCount: lastState.game.shownCount,
        markedCount: lastState.game.markedCount,
        secsPassed: gGame.secsPassed,
        minePos: JSON.parse(lastState.game.minePos),
        startTime: gGame.startTime,
        life: lastState.game.life,
        hint: lastState.game.hint,
        safe: lastState.game.safe,
        mega: lastState.game.mega,
        exterminate: lastState.game.exterminate,
        isHitOn: false,
        isMegaHintOn: lastState.game.isMegaHintOn,
        stateStack: gGame.stateStack
    }
    // JSON.parse(lastState.game)

    const elCells = document.querySelectorAll('.cell')
    for (var i = 0; i < elCells.length; i++) {
        elCells[i].addEventListener("contextmenu", function (e) {
            e.preventDefault()
        })
    }
    renderFlagsLeft()
}



// gets a position and array of position and return position's index, or -1 if doesn't exist
function getIndex(pos, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (pos.row === arr[i].row &&
            pos.col === arr[i].col) return i
    }
    return -1
}


// returns an array of unmarked mines (for exterminate funciton)
function getUnmarkedMine() {
    var minePos = []
    for (var i = 0; i < gGame.minePos.length; i++) {
        const currMinePos = gGame.minePos[i]
        if (!gBoard[currMinePos.row][currMinePos.col].isShown &&
            !gBoard[currMinePos.row][currMinePos.col].isMarked &&
            !gBoard[currMinePos.row][currMinePos.col].isUnknown) minePos.push(JSON.parse(JSON.stringify(currMinePos)))
    }
    return minePos
}

// player sound according to key - util
function playUtilSound(util) {
    switch (util) {
        case 'hint': HINT_SOUND.play()
            break
        case 'safe': SAFE_CLICK_SOUND.play()
            break
        case 'mega': MEGA_HINT_SOUND.play()
            break
        case 'undo': UNDO_SOUND.play()
            break
        case 'win': WIN_SOUND.play()
            break
        case 'lose': LOSE_SOUND.play()
            break
        case 'life': ONE_LIFE_DOWN_SOUND.play()
            break
        case 'exterminate': EXTERMINATE_SOUND.play()
            break
    }
}



// runs the utility a player uses
function useUtility(util, firstPos = null, secondPos = null) {
    if (!isMute) playUtilSound(util)
    if (util === 'safe') saveCurrState()
    gGame[util]--
    renderUtils(util)
    var className
    var hintTime = 1000
    if (util === 'mega') {
        hintTime = 2000
        className = `mega-hint-cell`
    } else className = `hint-cell`
    if (util === 'hint') {
        secondPos = { row: firstPos.row + 1, col: firstPos.col + 1 }
        firstPos = { row: firstPos.row - 1, col: firstPos.col - 1 }
    } else if (util === 'safe') {
        firstPos = getRandomHiddenCell(gBoard)
        secondPos = firstPos
        hintTime = 2000
    }

    isProccessing = true
    for (var i = firstPos.row; i <= secondPos.row; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = firstPos.col; j <= secondPos.col; j++) {
            if (j < 0 || j > gLevel.SIZE - 1) continue
            const currCell = gBoard[i][j]
            const elCurrCell = getElementByPos(i, j)
            if (currCell.isMine) {
                elCurrCell.classList.toggle('mine')
                renderImg(elCurrCell, MINE_IMG)
            } else {
                elCurrCell.classList.toggle(className)
                renderValue(elCurrCell, currCell.minesAroundCount)
            }

            setTimeout(() => {
                if (currCell.isMine) elCurrCell.classList.toggle('mine')
                else elCurrCell.classList.toggle(className)

                if (!currCell.isShown || !currCell.minesAroundCount) {
                    if (!currCell.isMarked && !currCell.isUnknown) renderValue(elCurrCell, '')
                    else if (currCell.isMarked) renderImg(elCurrCell, FLAG_IMG)
                    else renderValue(elCurrCell, '?')
                }
                if (currCell.isMine && currCell.isShown) renderImg(elCurrCell, MINE_IMG)
                isProccessing = false
            }, hintTime);

        }
    }
}

function toggleLight(nextMode) {
    if (nextMode === 'light') EL_TOGGLE_MODE.innerHTML = `<span>${LIGHT_MODE}</span> light mode`
    else EL_TOGGLE_MODE.innerHTML = `<span>${DARK_MODE}</span> dark mode`
    document.querySelector(`body`).classList.toggle('light-mode')
}