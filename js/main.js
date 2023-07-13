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
let isDroped = false
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

    // интевралы для всех струн, если строй не дропнут.
    // вынести в отдельну функцию рассчёт интервалов ? setIntervals
    // посчитал на пальцах, там где больш 12, там вычел 12, получается та же нота, октава = 12 полутонов
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
    
    //рассчёты нот для каждой струны. 
    //опять же проверка выпрыгнул из массива или нет, если да, то назад на длинну массиа или октаву 
    //попахивает дублированием кода
    //6 струна
    if (notes[currentTuningIndex]) {
        string5.textContent = notes[currentTuningIndex]
    } else {
        string5.textContent = notes[currentTuningIndex - notes.length]
    }
    //5 струна
    if (notes[currentTuningIndex + interval5]) {
        string5.textContent = notes[currentTuningIndex + interval5]
    } else {
        string5.textContent = notes[currentTuningIndex + interval5 - notes.length]
    }
    //струна 4 
    if (notes[currentTuningIndex + interval4]) {
        string4.textContent = notes[currentTuningIndex + interval4]
    } else {
        string4.textContent = notes[currentTuningIndex + interval4 - notes.length]
    }
    //струна 3 
    if (notes[currentTuningIndex + interval3]) {
        string3.textContent = notes[currentTuningIndex + interval3]
    } else {
        string3.textContent = notes[currentTuningIndex + interval3 - notes.length]
    }
    //струна 2
    if (notes[currentTuningIndex + interval2]) {
        string2.textContent = notes[currentTuningIndex + interval2]
    } else {
        string2.textContent = notes[currentTuningIndex + interval2 - notes.length]
    }
    //струна 1
    if (notes[currentTuningIndex + interval1]) {
        string1.textContent = notes[currentTuningIndex + interval1]
    } else {
        string1.textContent = notes[currentTuningIndex + interval1 - notes.length]
    }

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