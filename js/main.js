/* Получаем кнопки управления */
const prevBtn = document.querySelector('.control__btn_prev')
const nextBtn = document.querySelector('.control__btn_next')
const dropBtns = document.querySelectorAll('.tuning-type .segmented__btn') // Standard | Drop
const dropLabel = document.querySelector('.control__drop')     // «Drop» перед нотой: Drop D
const standardLabel = document.querySelector('.control__std')  // «Standard» после ноты: E Standard
/*Окошки струн строит instrument.js: у гитары 6, у баса 4 или 5, поэтому ищем их при каждом пересчёте
  (getStringBoxes — от 1-й струны, а нам нужно от самой толстой). Массив всех нот NOTES — в theory.js*/
const getStringsThickToThin = () => getStringBoxes().reverse()

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
// остаток от деления на 12 возвращает ноту в пределы октавы при любом интервале
const returnNoteToOctave = (interval, currentTuningIndex) => {
    return NOTES[(currentTuningIndex + interval) % NOTES.length]
}
//отделить корректировку индекса, от записи значения в хтмл струну
const writeCorrectNote = (intervals, currentTuningIndex) => {
    const strings = getStringsThickToThin()
    for(let i = 0; i < intervals.length; i++) {
        strings[i].textContent = returnNoteToOctave(intervals[i], currentTuningIndex)
    }
}
// интервалы для всех струн от самой толстой, если строй не дропнут: берём из стандартного строя инструмента
// (instrument.js): гитара 0 5 10 15 19 24, бас 0 5 10 15 (20). Где больше 12 — та же нота, октава = 12 полутонов
const setIntervals = () => {
    // если строй дроп, то самая толстая струна опущена на тон,
    // поэтому интервалы от неё до остальных струн больше на 2 полутона
    return getTuningSteps().map((step, i) => (step + (isDropped && i > 0 ? 2 : 0)) % 12)
}

const changeTuning = (direction) => {
    let currentTuning = document.querySelector('#currentTuning')
    let currentTuningIndex = NOTES.indexOf(currentTuning.textContent)

    if (direction === 'next') {
        currentTuningIndex++
    } else if (direction === 'prev') {
        currentTuningIndex--
    } 
    
    //при выходе за пределы массива нот перебрасываем  returnToNOTESArray useEndlesHarmony
    if(currentTuningIndex < 0) { 
        currentTuningIndex = NOTES.length - 1 //в конец массива
    } else if (currentTuningIndex > NOTES.length - 1) {
        currentTuningIndex = 0 //в начало
    }
    console.log(currentTuningIndex) // этот вывод пока очень важен, не удаляй
    
    currentTuning.textContent = NOTES[currentTuningIndex]

    //задаём интервалы для standard/drop (самая толстая струна — тоника строя)
    const intervals = setIntervals()

    writeCorrectNote(intervals, currentTuningIndex)
    
    /* изменение нот в строчке снизу — от самой толстой струны */ 
    document.querySelector('.control__notes').textContent =
        getStringsThickToThin().map(box => box.textContent).join(' ')
    //перерисовка грифа (функция объявлена ниже в этом же файле)
    changeNotesOnNeck()
    //ноты на грифе поменялись — заново подсвечиваем тональность и аккорд (функция из neck.js)
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


/* Перерисовка грифа: нота на струне и ладу = открытая нота струны (окошко на головке) + номер лада.
   Гриф строит fretboard.js, у каждой ноты data-string и data-fret, поэтому число струн и ладов любое.
   Пишем названия из NOTES (диезы); highlightNeck() потом переименует их по тональности (B♭ вместо A♯). */
const changeNotesOnNeck = () => {
    document.querySelectorAll('.guitar-neck .note').forEach(note => {
        const openNote = document.querySelector(`.app__notes-item_string${note.dataset.string}`).textContent
        note.textContent = NOTES[(NOTES.indexOf(openNote) + Number(note.dataset.fret)) % NOTES.length]
    })
}

//теория (гаммы, аккорды) — в theory.js, подсветка тональности и аккорда на грифе — в neck.js (highlightNeck)


changeTuning()
