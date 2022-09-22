'use strict'

// same old
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

function getClassStr(cell) {
    if (!cell.isShown) return ``
    if (!cell.isMine) return 'safe'
    else if (cell.isMine) return 'mine-marked'
    return ``
}

// returns the number of neighbours that has a key
function getNegsCountByKey(board, pos, key) {
    var count = 0
    for (var i = pos.row - 1; i <= pos.row + 1; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = pos.col - 1; j <= pos.col + 1; j++) {
            if (j < 0 || j > gLevel.SIZE - 1 ||
                (j === pos.col && i === pos.row)) continue
            if (key === 'isMarked' && board[i][j].isUnknown) count++
            if (board[i][j][key]) count++
        }
    }
    return count
}

// shows all neighours of a cell but the cell itslef
function showAllNegs(board, row, col) {
    // var minesCount = 0
    for (var i = row - 1; i <= row + 1; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = col - 1; j <= col + 1; j++) {
            const currCell = board[i][j]
            if (j < 0 || j > gLevel.SIZE - 1 ||
                (j === col && i === row) ||
                currCell.isMarked ||
                currCell.isUnknown ||
                currCell.isShown) continue
            const elCell = getElementByPos(i, j)
            if (currCell.isMine) revealMine(elCell, i, j)
            else stepOnCell(board, elCell, i, j)
            if (currCell.minesAroundCount && !currCell.isMine) {
                renderValue(elCell, currCell.minesAroundCount)
            } else expandShown(board, elCell, i, j)
        }
    }
    // return minesCount
}

// returns cell element
function getElementByPos(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`)
}

// to render strings
function renderValue(element, value) {
    element.innerText = value
}

// to render imgs
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
    const elTime = document.querySelector('.time')
    elTime.innerText = minutes + ' : ' + seconds
}

// adds/removes a `utiliy` from DOM (such as life, hint click or safe click)
function renderUtils(util) {
    const elLives = document.querySelector(`[id="${util}"] span`)
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
        }
    }
    renderImg(elLives, imgStr)
}


// returns a random HIDDEN cell. if isMine, that includes mines, otherwise it doesn't
function getRandomHiddenCell(board, isMine) {
    var positions = []
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[0].length; j++) {
            if (!board[i][j].isShown) {
                if (isMine) positions.push({ row: i, col: j })
                else if (!board[i][j].isMine) positions.push({ row: i, col: j })
            }
        }
    }
    var randomIdx = getRandomInt(0, positions.length)
    return positions.splice(randomIdx, 1)[0]
}

// util function for getting proper start and end index to show hint at function getHelp
// firstpos or secondpos are null for a random hint or safe click. if argumented with position functions as a utility for mega-hint
function getSearchPosition(util, firstPos = null, secondPos = null) {
    var hiddenCell
    var row
    var col
    var startRowIdx
    var startColIdx
    var endRowIdx
    var endColIdx
    if (!firstPos || !secondPos) {
        hiddenCell = getRandomHiddenCell(gBoard, util === 'hint')
        row = hiddenCell.row
        col = hiddenCell.col
        startRowIdx = (util === 'hint') ? row - 1 : row
        startColIdx = (util === 'hint') ? col - 1 : col
        endRowIdx = (util === 'hint') ? row + 1 : row
        endColIdx = (util === 'hint') ? col + 1 : col
    } else {
        startRowIdx = firstPos.row
        startColIdx = firstPos.col
        endRowIdx = secondPos.row
        endColIdx = secondPos.col
    }
    return {
        start: { row: startRowIdx, col: startColIdx },
        end: { row: endRowIdx, col: endColIdx }
    }
}

// saves best time on local sotrage
function setBestTime(level) {
    const currBestTime = +localStorage.getItem(`best ${level}`)
    if (!currBestTime || gGame.secsPassed < currBestTime) localStorage.setItem(`best ${level}`, gGame.secsPassed)
}

// calculates best time and renders
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
        minePos: gGame.minePos,
        startTime: gGame.startTime,
        life: gGame.life,
        hint: gGame.hint,
        safe: gGame.safe,
        isMegaHint: gGame.isMegaHint,
        manualPositionOn: gGame.manualPositionOn,
        startManually: gGame.startManually
    }

    gGame.stateStack.push({
        board: lastBoard,
        game: lastGame,
        elGameArea: document.querySelector('.game-area').innerHTML
    })
}

// pops the last state and renders it
function restoreLastState() {
    if (!gGame.stateStack.length || !gGame.isOn) return
    UNDO_SOUUND.play()
    const lastState = gGame.stateStack.pop()
    gBoard = JSON.parse(lastState.board)
    document.querySelector('.game-area').innerHTML = lastState.elGameArea
    gGame = {
        isOn: true,
        level: lastState.game.level,
        shownCount: lastState.game.shownCount,
        markedCount: lastState.game.markedCount,
        minePos: lastState.game.minePos,
        startTime: lastState.game.startTime,
        life: lastState.game.life,
        hint: lastState.game.hint,
        safe: lastState.game.safe,
        isMegaHint: lastState.game.isMegaHint,
        stateStack: gGame.stateStack,
        secsPassed: gGame.secsPassed,
        manualPositionOn: lastState.game.manualPositionOn,
        startManually: lastState.game.startManually
    }
    const elCells = document.querySelectorAll('.cell')
    for (var i = 0; i < elCells.length; i++) {
        elCells[i].addEventListener("contextmenu", function (e) {
            e.preventDefault()
        })
    }
}

// toggle manual position feature:
// first click is to position, second to stop positioning and hide the button
function onManualPosition(elButton) {
    if (!gLevel || gGame.isOn) return
    if (!gGame.manualPositionOn) {
        gGame.manualPositionOn = true
        elButton.innerText = 'all done'
    } else {
        for (var i = 0; i < gGame.minePos.length; i++) {
            const currPos = gGame.minePos[i]
            const elCell = getElementByPos(currPos.row, currPos.col)
            elCell.classList.remove('mine')
        }
        setMinesNegsCount(gBoard)
        elButton.style.visibility = `hidden`
        gGame.manualPositionOn = false;
        gGame.startManually = true
    }

}

// gets a position and array of position and return position's index, or -1 if doesn't exist
function getIndex(pos, arr) {
    for (var i = 0; i < arr.length; i++) {
        if (pos.row === arr[i].row &&
            pos.col === arr[i].col) return i
    }
    return -1
}

// function exterminate() {
//     if (gGame.usedExterminate || !gGame.isOn) return
//     EXTERMINATE_SOUND.play()
//     gGame.usedExterminate = true
//     var minePos = getUntouchedMine()
//     for (var i = 0; i < minePos.length && i < 3; i++) {
//         const randomIdx = getRandomInt(0, minePos.length)
//         const currMinePos = minePos.splice(randomIdx, 1)[0]
//         const idxInGgame = getIndex(currMinePos, gGame.minePos)
//         gBoard[currMinePos.row][currMinePos.col].isMine = false;
//         gGame.minePos.splice(idxInGgame, 1)
//     }
//     setMinesNegsCount(gBoard)
//     renderBoard()
//     checkGameOver()
// }

// function getUntouchedMine() {
//     var minePos = []
//     var idxInGgame = []
//     for (var i = 0; i < gGame.minePos.length; i++) {
//         const currMinePos = gGame.minePos[i]
//         if (!gBoard[currMinePos.row][currMinePos.col].isShown &&
//             !gBoard[currMinePos.row][currMinePos.col].isMarked &&
//             !gBoard[currMinePos.row][currMinePos.col].isUnknown) minePos.push(JSON.parse(JSON.stringify(currMinePos)))
//     }
//     return minePos
// }
