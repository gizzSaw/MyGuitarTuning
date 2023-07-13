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
const notes = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 
                'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', ];
/*
Всё это внутри функции переключения тональности
Получить ноту текущего строя из хтмл
Найти индекс ноты в массиве нот

если нажато вперёд, то увеличить индекс на 1
если назад, то уменьшить индекс на 1
Записать в переменную
Поставить эту ноту на шестую струну
Посчитать интервалы в полутонах для остальных струн, относительно шестой
Прибавить интевал к текущему индексу
Записать результат в нужную струну
Если элемент выходит за пределы массива const step2 = notes[index + int2] ? notes[index + int2] : notes[index + int2 - 12]; 
*/

isDroped = false

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

prevBtn.addEventListener('click', () => {
    changeTuning('prev')
})

nextBtn.addEventListener('click', () => {
    changeTuning('next')
})

dropBtn.addEventListener('click', () => {
    changeDroped('prev')
})



const changeTuning = (direction = null) => {
    let currentTuning = document.querySelector('#currentTuning')
    let currentTuningIndex = notes.indexOf(currentTuning.textContent)

    if (direction === 'next') {
        currentTuningIndex++
    } else if (direction === 'prev') {
        currentTuningIndex--
    } 
    // else {
    //     currentTuningIndex = 4
    // }
    
    if(currentTuningIndex < 0) {  /* из-за этого условия баг с нотой B */
        currentTuningIndex = notes.length - 1
    }
    console.log(currentTuningIndex)

    /* путаница с тернарным оператором, лучше переписать условия для каждой струны черз if */
    
    currentTuning.textContent = string6.textContent = notes[currentTuningIndex]

    // интевралы для всех струн, если строй не дропнут... вынести в отдельну функцию рассчёт интервалов ? setIntervals
    let interval5 =  5;
    let interval4 = 10; 
    let interval3 = 15; 
    let interval2 = 19 - 12; 
    let interval1 = 24 - 12; 
    // если строй дроп, то интервалы меньше на 2 полутона 
    if (isDroped) {
        interval5 += 2
        interval4 += 2
        interval3 += 2
        interval2 += 2
        interval1 += 2
    }
    
    //рассчёты нот для каждой струны
    if (notes[currentTuningIndex + interval5]) {
        string5.textContent = notes[currentTuningIndex + interval5]
    } else {
        string5.textContent = notes[currentTuningIndex + interval5 - 12]
    }
    //струна 4 
    if (notes[currentTuningIndex + interval4]) {
        string4.textContent = notes[currentTuningIndex + interval4]
    } else {
        string4.textContent = notes[currentTuningIndex + interval4 - 12]
    }
    //струна 3 
    if (notes[currentTuningIndex + interval3]) {
        string3.textContent = notes[currentTuningIndex + interval3]
    } else {
        string3.textContent = notes[currentTuningIndex + interval3 - 24]
    }
    //струна 2
    if (notes[currentTuningIndex + interval2]) {
        string2.textContent = notes[currentTuningIndex + interval2]
    } else {
        string2.textContent = notes[currentTuningIndex + interval2 - 12]
    }
    //струна 3
    if (notes[currentTuningIndex + interval1]) {
        string1.textContent = notes[currentTuningIndex + interval1]
    } else {
        string1.textContent = notes[currentTuningIndex + interval1 - 12]
    }

    //string5.textContent = notes[currentTuningIndex + 5] ? notes[currentTuningIndex + 5] : notes[currentTuningIndex + 5 - 12]
    //string4.textContent = notes[currentTuningIndex + 10] ? notes[currentTuningIndex + 10] : notes[currentTuningIndex + 10 - 12]
    //string3.textContent = notes[currentTuningIndex + 15] ? notes[currentTuningIndex + 15] : notes[currentTuningIndex + 15 - 24]
    //string2.textContent = notes[currentTuningIndex + 19 - 12] ? notes[currentTuningIndex + 19 - 12] : notes[currentTuningIndex + 19 - 24]
    //string1.textContent = notes[currentTuningIndex + 24 - 12] ? notes[currentTuningIndex + 24 - 12] : notes[currentTuningIndex + 24 - 24]

    // console.log(
    //     string6,
    //     string5,
    //     string4,
    //     string3,
    //     string2,
    //     string1)

    /* изменение нот в строке контроля */ 
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