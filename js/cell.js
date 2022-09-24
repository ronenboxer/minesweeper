'use strict'

// when player clicks a cell
function cellClicked(elCell, row, col) {
    if (isProccessing) return

    // for manual position mode
    if (isManualPositionOn) {
        positionMine(row, col)
        return
    }

    // to check if a regular game has its first click to randomize mines
    if (!gGame.shownCount && !is7Boom && !gGame.isOn) {
        if (!isManualPositionOn) getRandomMinesPos(row, col)
        gGame.isOn = true
        gGame.startTime = Date.now()
        timerIntervalId = setInterval(renderTime, 1000)
    } else if (!gGame.isOn) return

    // if player used mega hint, select border cells instead of reveal them 
    // if not, check to see if player used regular hint
    if (gGame.isMegaHintOn && gGame.mega) {
        elCell.classList.toggle('selected-cell')
        if (!gGame.megaHintFirstPos) gGame.megaHintFirstPos = { row: row, col: col }
        else showMegaHint(gGame.megaHintFirstPos, { row: row, col: col })
        return
    } else if (gGame.isHitOn) {
        useUtility('hint', { row: row, col: col })
        gGame.isHitOn = false
        return
    }

    const currCell = gBoard[row][col]
    // to avoid revealing marked cells
    if (currCell.isMarked || currCell.isUnkown) return

    // if player stepped on mine
    if (gBoard[row][col].isMine) {
        // if player has no more life left, reveal all mines and end game
        if (!gGame.life) revealAllMines()
        // if they have more life, update model
        else revealMine(elCell, row, col)
        // if cell is not mine, player can see its content.
    } else {
        const minesAroundCount = gBoard[row][col].minesAroundCount
        const flagsAroundCount = getNegsCountByKey(gBoard, { row: row, col: col }, 'isMarked')
        // if the nuumber of the cell is equal to the number of flaged negigbours, show all neighbour
        if (minesAroundCount &&
            minesAroundCount === flagsAroundCount) showAllNegs(gBoard, row, col)
        expandShown(gBoard, elCell, row, col)
    }


    // pushes to stateStck
    saveCurrState()
    renderFlagsLeft()
    checkGameOver()
}



// when user right-clicks. they can make an unrevealed cell be makred with a flag, a `?` or delete the mark
function cellMarked(elCell, row, col) {
    if (isProccessing) return
    const currCell = gBoard[row][col]
    if (!gGame.isOn || currCell.isShown) return

    saveCurrState()

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

    renderFlagsLeft()
    checkGameOver()
}




// a function that reveals neighbours cells with 0 mined neighbours
function expandShown(board, elCell, row, col) {
    const currCell = gBoard[row][col]

    // cant check marked cells
    if (currCell.isMarked || currCell.isUnkown) return

    // gets amount of mines around
    const minesCount = currCell.minesAroundCount
    if (!currCell.isShown) stepOnCell(board, elCell, row, col) //model

    // if there are mines around, stop looking for neighbours
    if (minesCount) {
        renderValue(elCell, minesCount) //DOM - shows numbers bigger than 0
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



// updates DOM and model
function stepOnCell(board, elCell, row, col) {
    elCell.classList.add('safe')
    board[row][col].isShown = true
    gGame.shownCount++
}



// toggles between adding or removing seleced cell as mine on manual mode
function positionMine(row, col) {
    const currMine = { row: row, col: col }
    const elCell = getElementByPos(row, col)
    const mineIndex = getIndex(currMine, gGame.minePos)
    const currCell = gBoard[row][col]
    // -1 if mine doesn't exist yet
    if (mineIndex === -1) gGame.minePos.push(currMine)
    else gGame.minePos.splice(mineIndex, 1)

    // update model and DOM
    currCell.isMine = !currCell.isMine
    elCell.classList.toggle('mine')
    renderValue(EL_FLAGS_LEFT, gGame.minePos.length)
}