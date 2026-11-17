/* Получаем кнопки управления */
const prevBtn = document.querySelector('.control__btn_prev')
const nextBtn = document.querySelector('.control__btn_next')
const dropBtns = document.querySelectorAll('.tuning-type .segmented__btn') // Standard | Drop
const dropLabel = document.querySelector('.control__drop')     // «Drop» перед нотой: Drop D
const standardLabel = document.querySelector('.control__std')  // «Standard» после ноты: E Standard
/*Окошки струн строит instrument.js: у гитары 6, у баса 4 или 5, поэтому ищем их при каждом пересчёте
  (getStringBoxes — от 1-й струны, а нам нужно от самой толстой). Массив всех нот NOTES — в theory.js*/
const getStringsThickToThin = () => getStringBoxes().reverse()

/* Строй общий для гитары и баса, как в группе: сдвиг от стандартного в полутонах и дроп.
   Гитара D Standard -> бас D Standard (5-струнный — A Standard), гитара Drop D -> бас Drop D (5-струнный — Drop A).
   Открытые струны каждого инструмента считает getOpenMidis (instrument.js); окошки на головке и название строя
   показывают инструмент, выбранный в карточке Tuning */
let tuningShift = 0 // −6…+5: E Standard — 0, D Standard — −2
// изначально строй не дропнут
let isDropped = false
const setDropped = (value) => {
    isDropped = value
    // активная кнопка переключателя — aria-pressed="true", её подсвечивает CSS
    dropBtns.forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.drop === String(value)))
    dropLabel.hidden = !value
    standardLabel.hidden = value
    changeTuning()
}
//отделить расчёт строя (getOpenMidis), от записи значения в хтмл струну
const writeCorrectNote = openMidis => {
    getStringBoxes().forEach(box => {
        box.textContent = NOTES[openMidis[box.dataset.string - 1] % NOTES.length]
    })
}

const changeTuning = (direction) => {
    if (direction === 'next') {
        tuningShift++
    } else if (direction === 'prev') {
        tuningShift--
    }

    //при выходе за пределы перебрасываем: сдвиг держим в −6…+5, через 12 полутонов — та же нота, октава = 12 полутонов
    if(tuningShift < -6) {
        tuningShift += 12
    } else if (tuningShift > 5) {
        tuningShift -= 12
    }
    // тоника строя — самая толстая струна выбранного инструмента
    const openMidis = getOpenMidis(getSelectedKey())
    const currentTuningIndex = openMidis[openMidis.length - 1] % NOTES.length
    console.log(currentTuningIndex) // этот вывод пока очень важен, не удаляй

    document.querySelector('#currentTuning').textContent = NOTES[currentTuningIndex]

    writeCorrectNote(openMidis)

    /* изменение нот в строчке снизу — от самой толстой струны */
    document.querySelector('.control__notes').textContent =
        getStringsThickToThin().map(box => box.textContent).join(' ')
    //перерисовка грифов (функция объявлена ниже в этом же файле)
    changeNotesOnNeck()
    //ноты на грифах поменялись — заново подсвечиваем тональность и аккорд (функция из neck.js)
    highlightNeck()
}




//вешаем события на кнопки
prevBtn.addEventListener('click', () => {
    changeTuning('prev')
})

nextBtn.addEventListener('click', () => {
    changeTuning('next')
})

dropBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setDropped(btn.dataset.drop === 'true')
    })
})


/* Перерисовка грифов (гитары и баса): нота на струне и ладу = открытая струна инструмента этого грифа + лад.
   Грифы строит fretboard.js, у каждой ноты data-string и data-fret, инструмент — data-instrument контейнера.
   Пишем названия из NOTES (диезы); highlightNeck() потом переименует их по тональности (B♭ вместо A♯). */
const changeNotesOnNeck = () => {
    document.querySelectorAll('.guitar-neck__inner').forEach(board => {
        const openMidis = getOpenMidis(fretboardKey(board))
        board.querySelectorAll('.note').forEach(note => {
            note.textContent = NOTES[(openMidis[note.dataset.string - 1] + Number(note.dataset.fret)) % NOTES.length]
        })
    })
}

//теория (гаммы, аккорды) — в theory.js, подсветка тональности и аккорда на грифах — в neck.js (highlightNeck)


changeTuning()
