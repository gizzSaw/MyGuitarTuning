/* Получаем кнопки управления */
const prevBtn = document.querySelector('.control__btn_prev')
const nextBtn = document.querySelector('.control__btn_next')
const dropBtn = document.querySelector('.dropBtn')
/*Получаем окошко каждой струны*/
const string6 = document.querySelector('.app__notes-item_string6')
const string5 = document.querySelector('.app__notes-item_string5')
const string4 = document.querySelector('.app__notes-item_string4')
const string3 = document.querySelector('.app__notes-item_string3')
const string2 = document.querySelector('.app__notes-item_string2')
const string1 = document.querySelector('.app__notes-item_string1')
/*Массив всех нот*/
const NOTES = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ]
const strings = [string6,string5,string4,string3,string2,string1] 

// изначально строй не дропнут
let isDroped = false
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
const returnNoteToOctave = (intrval, currentTuningIndex) => {
    if(NOTES[currentTuningIndex + intrval]){
        return NOTES[currentTuningIndex + intrval]
    } else {
        return NOTES[currentTuningIndex + intrval - NOTES.length]
    }
}
//отделить корректировку индекса, от записи значения в хтмл струну 
const writeCorrectNote = (intrvals, currentTuningIndex) => {
    for(let i = 0; i < intrvals.length; i++) {  
        strings[i].textContent = returnNoteToOctave(intrvals[i], currentTuningIndex)
        strings[i].textContent = returnNoteToOctave(intrvals[i], currentTuningIndex)
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
    console.log(currentTuningIndex) // этот вывод пока очень важен, не удоляй
    
    currentTuning.textContent = string6.textContent = NOTES[currentTuningIndex]

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
    //вызов метода из neck.js
    changeNotesOnNeck()
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


//так можно докопатья до конкретной ноты на конкрутном ладу и струне
// 0 лад
const fret0string1 = document.querySelector('.fret_0 .string1 .note')
const fret0string2 = document.querySelector('.fret_0 .string2 .note')
const fret0string3 = document.querySelector('.fret_0 .string3 .note')
const fret0string4 = document.querySelector('.fret_0 .string4 .note')
const fret0string5 = document.querySelector('.fret_0 .string5 .note')
const fret0string6 = document.querySelector('.fret_0 .string6 .note')

const fret1string1 = document.querySelector('.fret_1 .string1 .note')
const fret1string2 = document.querySelector('.fret_1 .string2 .note')
const fret1string3 = document.querySelector('.fret_1 .string3 .note')
const fret1string4 = document.querySelector('.fret_1 .string4 .note')
const fret1string5 = document.querySelector('.fret_1 .string5 .note')
const fret1string6 = document.querySelector('.fret_1 .string6 .note')

const fret2string1 = document.querySelector('.fret_2 .string1 .note')
const fret2string2 = document.querySelector('.fret_2 .string2 .note')
const fret2string3 = document.querySelector('.fret_2 .string3 .note')
const fret2string4 = document.querySelector('.fret_2 .string4 .note')
const fret2string5 = document.querySelector('.fret_2 .string5 .note')
const fret2string6 = document.querySelector('.fret_2 .string6 .note')

const fret3string1 = document.querySelector('.fret_3 .string1 .note')
const fret3string2 = document.querySelector('.fret_3 .string2 .note')
const fret3string3 = document.querySelector('.fret_3 .string3 .note')
const fret3string4 = document.querySelector('.fret_3 .string4 .note')
const fret3string5 = document.querySelector('.fret_3 .string5 .note')
const fret3string6 = document.querySelector('.fret_3 .string6 .note')

const fret4string1 = document.querySelector('.fret_4 .string1 .note')
const fret4string2 = document.querySelector('.fret_4 .string2 .note')
const fret4string3 = document.querySelector('.fret_4 .string3 .note')
const fret4string4 = document.querySelector('.fret_4 .string4 .note')
const fret4string5 = document.querySelector('.fret_4 .string5 .note')
const fret4string6 = document.querySelector('.fret_4 .string6 .note')

const fret5string1 = document.querySelector('.fret_5 .string1 .note')
const fret5string2 = document.querySelector('.fret_5 .string2 .note')
const fret5string3 = document.querySelector('.fret_5 .string3 .note')
const fret5string4 = document.querySelector('.fret_5 .string4 .note')
const fret5string5 = document.querySelector('.fret_5 .string5 .note')
const fret5string6 = document.querySelector('.fret_5 .string6 .note')

const fret6string1 = document.querySelector('.fret_6 .string1 .note')
const fret6string2 = document.querySelector('.fret_6 .string2 .note')
const fret6string3 = document.querySelector('.fret_6 .string3 .note')
const fret6string4 = document.querySelector('.fret_6 .string4 .note')
const fret6string5 = document.querySelector('.fret_6 .string5 .note')
const fret6string6 = document.querySelector('.fret_6 .string6 .note')

const fret7string1 = document.querySelector('.fret_7 .string1 .note')
const fret7string2 = document.querySelector('.fret_7 .string2 .note')
const fret7string3 = document.querySelector('.fret_7 .string3 .note')
const fret7string4 = document.querySelector('.fret_7 .string4 .note')
const fret7string5 = document.querySelector('.fret_7 .string5 .note')
const fret7string6 = document.querySelector('.fret_7 .string6 .note')

const fret8string1 = document.querySelector('.fret_8 .string1 .note')
const fret8string2 = document.querySelector('.fret_8 .string2 .note')
const fret8string3 = document.querySelector('.fret_8 .string3 .note')
const fret8string4 = document.querySelector('.fret_8 .string4 .note')
const fret8string5 = document.querySelector('.fret_8 .string5 .note')
const fret8string6 = document.querySelector('.fret_8 .string6 .note')

const fret9string1 = document.querySelector('.fret_9 .string1 .note')
const fret9string2 = document.querySelector('.fret_9 .string2 .note')
const fret9string3 = document.querySelector('.fret_9 .string3 .note')
const fret9string4 = document.querySelector('.fret_9 .string4 .note')
const fret9string5 = document.querySelector('.fret_9 .string5 .note')
const fret9string6 = document.querySelector('.fret_9 .string6 .note')

const fret10string1 = document.querySelector('.fret_10 .string1 .note')
const fret10string2 = document.querySelector('.fret_10 .string2 .note')
const fret10string3 = document.querySelector('.fret_10 .string3 .note')
const fret10string4 = document.querySelector('.fret_10 .string4 .note')
const fret10string5 = document.querySelector('.fret_10 .string5 .note')
const fret10string6 = document.querySelector('.fret_10 .string6 .note')

const fret11string1 = document.querySelector('.fret_11 .string1 .note')
const fret11string2 = document.querySelector('.fret_11 .string2 .note')
const fret11string3 = document.querySelector('.fret_11 .string3 .note')
const fret11string4 = document.querySelector('.fret_11 .string4 .note')
const fret11string5 = document.querySelector('.fret_11 .string5 .note')
const fret11string6 = document.querySelector('.fret_11 .string6 .note')

const fret12string1 = document.querySelector('.fret_12 .string1 .note')
const fret12string2 = document.querySelector('.fret_12 .string2 .note')
const fret12string3 = document.querySelector('.fret_12 .string3 .note')
const fret12string4 = document.querySelector('.fret_12 .string4 .note')
const fret12string5 = document.querySelector('.fret_12 .string5 .note')
const fret12string6 = document.querySelector('.fret_12 .string6 .note')

//запихну в массив
const stringsOnFret0 = [ 
    fret0string1,
    fret0string2,
    fret0string3,
    fret0string4,
    fret0string5,
    fret0string6
]

const stringsOnFret1 = [ 
    fret1string1,
    fret1string2,
    fret1string3,
    fret1string4,
    fret1string5,
    fret1string6
]

const stringsOnFret2 = [ 
    fret2string1,
    fret2string2,
    fret2string3,
    fret2string4,
    fret2string5,
    fret2string6
]

const stringsOnFret3 = [ 
    fret3string1,
    fret3string2,
    fret3string3,
    fret3string4,
    fret3string5,
    fret3string6
]

const stringsOnFret4 = [ 
    fret4string1,
    fret4string2,
    fret4string3,
    fret4string4,
    fret4string5,
    fret4string6
]

const stringsOnFret5 = [ 
    fret5string1,
    fret5string2,
    fret5string3,
    fret5string4,
    fret5string5,
    fret5string6
]

const stringsOnFret6 = [ 
    fret6string1,
    fret6string2,
    fret6string3,
    fret6string4,
    fret6string5,
    fret6string6
]

const stringsOnFret7 = [ 
    fret7string1,
    fret7string2,
    fret7string3,
    fret7string4,
    fret7string5,
    fret7string6
]

const stringsOnFret8 = [ 
    fret8string1,
    fret8string2,
    fret8string3,
    fret8string4,
    fret8string5,
    fret8string6
]

const stringsOnFret9 = [ 
    fret9string1,
    fret9string2,
    fret9string3,
    fret9string4,
    fret9string5,
    fret9string6
]

const stringsOnFret10 = [ 
    fret10string1,
    fret10string2,
    fret10string3,
    fret10string4,
    fret10string5,
    fret10string6
]

const stringsOnFret11 = [ 
    fret11string1,
    fret11string2,
    fret11string3,
    fret11string4,
    fret11string5,
    fret11string6
]

const stringsOnFret12 = [ 
    fret12string1,
    fret12string2,
    fret12string3,
    fret12string4,
    fret12string5,
    fret12string6
]

//получить ноты из хтмл первого приложения
 // от первой до 6 струны

 
 
 
 
 
 

 const changeNotesOnNeck = () => {
    const currentTuning = [
        string1.textContent, 
        string2.textContent, 
        string3.textContent, 
        string4.textContent, 
        string5.textContent, 
        string6.textContent
]

currentTuning.forEach((item, index) => {
    stringsOnFret0[index].textContent = item

    const indexFromNotesFor1Fret = NOTES.indexOf(stringsOnFret0[index].textContent) // из нот взяли индекс для этой струны
    if (NOTES[indexFromNotesFor1Fret + 1]){
        stringsOnFret1[index].textContent = NOTES[indexFromNotesFor1Fret + 1]
    } else {
        stringsOnFret1[index].textContent = NOTES[indexFromNotesFor1Fret + 1 - 12]
    }

    const indexFromNotesFor2Fret = NOTES.indexOf(stringsOnFret1[index].textContent) 
    if (NOTES[indexFromNotesFor2Fret + 1]){
        stringsOnFret2[index].textContent = NOTES[indexFromNotesFor2Fret + 1]
    } else {
        stringsOnFret2[index].textContent = NOTES[indexFromNotesFor2Fret + 1 - 12]
    }


    const indexFromNotesFor3Fret = NOTES.indexOf(stringsOnFret2[index].textContent) 
    if (NOTES[indexFromNotesFor3Fret + 1]){
        stringsOnFret3[index].textContent = NOTES[indexFromNotesFor3Fret + 1]
    } else {
        stringsOnFret3[index].textContent = NOTES[indexFromNotesFor3Fret + 1 - 12]
    }

    const indexFromNotesFor4Fret = NOTES.indexOf(stringsOnFret3[index].textContent) 
    if (NOTES[indexFromNotesFor4Fret + 1]){
        stringsOnFret4[index].textContent = NOTES[indexFromNotesFor4Fret + 1]
    } else {
        stringsOnFret4[index].textContent = NOTES[indexFromNotesFor4Fret + 1 - 12]
    }

    const indexFromNotesFor5Fret = NOTES.indexOf(stringsOnFret4[index].textContent) 
    if (NOTES[indexFromNotesFor5Fret + 1]){
        stringsOnFret5[index].textContent = NOTES[indexFromNotesFor5Fret + 1]
    } else {
        stringsOnFret5[index].textContent = NOTES[indexFromNotesFor5Fret + 1 - 12]
    }

    const indexFromNotesFor6Fret = NOTES.indexOf(stringsOnFret5[index].textContent) 
    if (NOTES[indexFromNotesFor6Fret + 1]){
        stringsOnFret6[index].textContent = NOTES[indexFromNotesFor6Fret + 1]
    } else {
        stringsOnFret6[index].textContent = NOTES[indexFromNotesFor6Fret + 1 - 12]
    }

    const indexFromNotesFor7Fret = NOTES.indexOf(stringsOnFret6[index].textContent) 
    if (NOTES[indexFromNotesFor7Fret + 1]){
        stringsOnFret7[index].textContent = NOTES[indexFromNotesFor7Fret + 1]
    } else {
        stringsOnFret7[index].textContent = NOTES[indexFromNotesFor7Fret + 1 - 12]
    }

    const indexFromNotesFor8Fret = NOTES.indexOf(stringsOnFret7[index].textContent) 
    if (NOTES[indexFromNotesFor8Fret + 1]){
        stringsOnFret8[index].textContent = NOTES[indexFromNotesFor8Fret + 1]
    } else {
        stringsOnFret8[index].textContent = NOTES[indexFromNotesFor8Fret + 1 - 12]
    }

    const indexFromNotesFor9Fret = NOTES.indexOf(stringsOnFret8[index].textContent) 
    if (NOTES[indexFromNotesFor9Fret + 1]){
        stringsOnFret9[index].textContent = NOTES[indexFromNotesFor9Fret + 1]
    } else {
        stringsOnFret9[index].textContent = NOTES[indexFromNotesFor9Fret + 1 - 12]
    }
    
    const indexFromNotesFor10Fret = NOTES.indexOf(stringsOnFret9[index].textContent) 
    if (NOTES[indexFromNotesFor10Fret + 1]){
        stringsOnFret10[index].textContent = NOTES[indexFromNotesFor10Fret + 1]
    } else {
        stringsOnFret10[index].textContent = NOTES[indexFromNotesFor10Fret + 1 - 12]
    }

    const indexFromNotesFor11Fret = NOTES.indexOf(stringsOnFret10[index].textContent) 
    if (NOTES[indexFromNotesFor11Fret + 1]){
        stringsOnFret11[index].textContent = NOTES[indexFromNotesFor11Fret + 1]
    } else {
        stringsOnFret11[index].textContent = NOTES[indexFromNotesFor11Fret + 1 - 12]
    }

    const indexFromNotesFor12Fret = NOTES.indexOf(stringsOnFret11[index].textContent) 
    if (NOTES[indexFromNotesFor12Fret + 1]){
        stringsOnFret12[index].textContent = NOTES[indexFromNotesFor12Fret + 1]
    } else {
        stringsOnFret12[index].textContent = NOTES[indexFromNotesFor12Fret + 1 - 12]
    }
})
}



//поставить эти ноты на 0 лад каждой струны




//получить ноты из хтмл первого приложения
//от нулевого лада получить струну, и как то в неё это запихнуть 
//тоже самое для всех струн
//потом прикрутит расчёт тональностей, 
//в котором сначала выбрать элементы для удаления, а потом повесить им класс хидден

// inners.forEach((item) => {
//     if (item.textContent === 'F#' || 
//         item.textContent === 'G#' ||  
//         item.textContent === 'A#' ||  
//         item.textContent === 'C#' ||  
//         item.textContent === 'D#'   
//     ) {
//         item.classList.add('hidden')
//     }
//     console.log(item.textContent)
// })


changeTuning()
