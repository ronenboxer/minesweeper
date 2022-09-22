'use strict'

// when player clicks a cell
function cellClicked(elCell, row, col) {
    if (isProccessing) return

    // for manual position mode
    if (gGame.manualPositionOn) {
        positionMine(row, col)
        return
    }

    //model
    const currCell = gBoard[row][col]
    if ((currCell.isMarked && !currCell.isShown) || currCell.isUnkown) return // can't press illegal cells

    // to check if a regular game has its first click to randomize mines
    if (!gGame.shownCount && !is7Boom && !gGame.isOn) {
        if (!gGame.startManually) getRandomMinesPos({ row: row, col: col })
        gGame.isOn = true
        gGame.startTime = Date.now()
        timerIntervalId = setInterval(renderTime, 1000)
    } else if (!gGame.isOn) return

    // pushes to stateStck
    saveCurrState()

    // if player asked for mega hint, select border cells instead of click them
    if (gGame.isMegaHint) {
        elCell.classList.add('mega-hint-cell')
        if (!gGame.megaHintFirstPos) gGame.megaHintFirstPos = { row: row, col: col }
        else showMegaHint(gGame.megaHintFirstPos, { row: row, col: col })
        return
    }

    // update model and DOM
    if (gBoard[row][col].isMine) {
        if (!gGame.life) revealAllMines()
        else revealMine(elCell, row, col)
    } else {
        expandShown(gBoard, elCell, row, col)
        const minesAroundCount = gBoard[row][col].minesAroundCount
        const flagsAroundCount = getNegsCountByKey(gBoard, { row: row, col: col }, 'isMarked')
        if (minesAroundCount && minesAroundCount === flagsAroundCount) {
            showAllNegs(gBoard, row, col)
        }
    }

    checkGameOver()
}

// when user right-clicks. they can make an unsafe cell makred with a flag, a `?` or delete the mark
function cellMarked(elCell, row, col) {
    if (isProccessing) return

    saveCurrState()

    const currCell = gBoard[row][col]
    if (!gGame.isOn || currCell.isShown) return
    if (currCell.isMarked) {
        //model
        currCell.isMarked = false
        currCell.isUnkown = true
        //DOM
        renderValue(elCell, '?')
        gGame.markedCount--
    } else if (currCell.isUnkown) {
        //model
        currCell.isUnkown = false
        //DOM
        renderValue(elCell, '')

    } else {
        //model
        gGame.markedCount++
        currCell.isMarked = true
        //DOM
        renderImg(elCell, FLAG_IMG)
    }
    checkGameOver()
}

// a function that reveals neighbours cells with 0 mined neighbours
function expandShown(board, elCell, row, col) {
    // cant check marked cells
    if (board[row][col].isMarked || board[row][col].isUnkown) return

    // checks amount of mines around
    const minesAroundCount = board[row][col].minesAroundCount
    if (!board[row][col].isShown) stepOnCell(board, elCell, row, col) //model

    // if there are mines around, stop looking for neighbours
    if (minesAroundCount) {
        renderValue(elCell, minesAroundCount) //DOM - shows numbers bigger than 0
        return
    }

    // 0 mines as nighbours, time to expand
    for (var i = row - 1; i <= row + 1; i++) {
        if (i < 0 || i > gLevel.SIZE - 1) continue
        for (var j = col - 1; j <= col + 1; j++) {
            if (j < 0 || j > gLevel.SIZE - 1 ||
                (i === row && j === col)) continue
            if (board[i][j].isShown) continue
            const elCurrCell = getElementByPos(i, j)
            expandShown(board, elCurrCell, i, j)
        }
    }
}

// updates DOM
function stepOnCell(board, elCell, row, col) {
    elCell.classList.add('safe')
    board[row][col].isShown = true
    gGame.shownCount++
}

// toggles between adding or removing seleced mine cell on manual mode
function positionMine(row, col) {
    if (gGame.manualPositionOn) {
        const currMine = { row: row, col: col }
        const elCell = getElementByPos(row,col)
        const mineIndex = getIndex(currMine, gGame.minePos)
        if (mineIndex === -1) {
            gGame.minePos.push(currMine)
            gBoard[row][col].isMine = true
            elCell.classList.add('mine')
        }
        else {
            gGame.minePos.splice(mineIndex, 1)[0]
            gBoard[row][col].isMine = false
            elCell.classList.remove('mine')
        }
    }
}