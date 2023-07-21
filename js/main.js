/* Получаем кнопки управления */
const prevBtn = document.querySelector('.control__btn_prev')
const nextBtn = document.querySelector('.control__btn_next')
const dropBtn = document.querySelector('.dropBtn')
/*Получаем окошко каждой струны*/
const string6 = document.querySelector('.string6')
const string5 = document.querySelector('.string5')
const string4 = document.querySelector('.string4')
const string3 = document.querySelector('.string3')
const string2 = document.querySelector('.string2')
const string1 = document.querySelector('.string1')
/*Массив всех нот*/
const notes = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ]
const strings = [string6,string5,string4,string3,string2,string1] 


isDroped = false

// изначально строй не дропнут
const changeDroped = () => {
    if(isDroped) {
        isDroped = false
        dropBtn.textContent = 'Standart'
    } else {
        isDroped = true
        dropBtn.textContent = 'Droped'
    }
    changeTuning()
}

//отделить корректировку индекса, от записи значения в струну
const writeCorrectNote = (intrvals, currentTuningIndex) => {
    for(let i = 0; i < intrvals.length; i++) {
        if(notes[currentTuningIndex + intrvals[i]]){
            strings[i].textContent = notes[currentTuningIndex + intrvals[i]]
        } else {
            strings[i].textContent = notes[currentTuningIndex + intrvals[i] - notes.length]
        }
    }
}

// интевралы для всех струн, если строй не дропнут.
// посчитал на пальцах, там где больш 12, там вычел 12, получается та же нота, октава = 12 полутонов
const setIntervals = () => {
    let interval6 = 0
    let interval5 =  5
    let interval4 = 10
    let interval3 = 3
    let interval2 = 7
    let interval1 = 0
    // если строй дроп, то интервалы меньше на 2 полутона 
    if (isDroped) {
        interval5 += 2
        interval4 += 2 //вот тут если бы была 3, то уже был бы баг при сложении с interval4
        interval3 += 2
        interval2 += 2
        interval1 += 2
    }

    return {interval6,interval5, interval4,interval3,interval2,interval1}
}

//вешаем события на кнопки
prevBtn.addEventListener('click', () => {
    changeTuning('prev')
})

nextBtn.addEventListener('click', () => {
    changeTuning('next')
})

dropBtn.addEventListener('click', () => {
    changeDroped('prev')
})



const changeTuning = (direction) => {
    let currentTuning = document.querySelector('#currentTuning')
    let currentTuningIndex = notes.indexOf(currentTuning.textContent)

    if (direction === 'next') {
        currentTuningIndex++
    } else if (direction === 'prev') {
        currentTuningIndex--
    } 
    
    //при выходе за пределы массива перебрасываем 
    if(currentTuningIndex < 0) { 
        currentTuningIndex = notes.length - 1 //в конец массива
    } else if (currentTuningIndex > notes.length - 1) {
        currentTuningIndex = 0 //в начало
    }
    console.log(currentTuningIndex) // этот вывод пока очень важен, не удоляй
    
    currentTuning.textContent = string6.textContent = notes[currentTuningIndex]

    //задаём интервалы для standart/drop
    const {interval6,interval5, interval4,interval3,interval2,interval1} = setIntervals()
    const intrvals = [interval6,interval5, interval4,interval3,interval2,interval1]

    writeCorrectNote(intrvals, currentTuningIndex)
    
    /* изменение нот в строчке снизу */ 
    document.querySelector('.control__notes').textContent = (
        string6.textContent + " " +
        string5.textContent + " " +
        string4.textContent + " " +
        string3.textContent + " " +
        string2.textContent + " " +
        string1.textContent 
    )
}

changeTuning()