/* Физика бірліктер түрлендіргіші (claude.ai артефактінен көшірілді). */
(function(){
"use strict";

/* ---------- i18n ---------- */
const T = {
kk:{
  eyebrow:'Физика · 7–11 сынып',
  title:'Физикалық шамалар түрлендіргіші',
  sub:'Бірліктерді бір-біріне ауыстырады және әр қадамын көрсетеді.',
  bigFont:'Үлкен шрифт (проектор үшін)',
  mConv:'Түрлендіргіш', mPrac:'Жаттығу', mPref:'ХБЖ қосымшалары',
  value:'Мәні', from:'Қай бірліктен', to:'Қай бірлікке', swap:'Бірліктерді ауыстыру', insPow:'10-ның дәрежесін енгізу',
  result:'Нәтиже', std:'Стандарт түрде:', plain:'Ондық жазба:', sig:'Мәнді цифр:', copy:'Көшіру', copied:'Көшірілді ✓', copyFail:'Мәтінді белгілеп, өзіңіз көшіріңіз',
  steps:'Шешу қадамдары', all:'Барлық бірліктерде', allHint:'Бірлікті басыңыз — ол «Қай бірлікке» өрісіне қойылады.',
  tip:'Есте сақта', si:'ХБЖ', siUnit:'ХБЖ бірлігі:', src:'берілген',
  badInput:'Санды дұрыс енгізіңіз: мысалы 2,5 немесе 3·10^5 немесе 3e5.',
  defA:'Берілген бірлікті ХБЖ бірлігі арқылы өрнектейміз',
  defB:'Ізделетін бірлікті ХБЖ бірлігі арқылы өрнектейміз',
  coef:'Түрлендіру коэффициентін табамыз',
  fin:'Берілген мәнді коэффициентке көбейтеміз',
  same:'Бірліктер бірдей — түрлендіру қажет емес',
  tFormula:'Шкалалар арасындағы байланыс формуласын қолданамыз',
  tFirst:'Алдымен Цельсий шкаласына көшеміз',
  tThen:'Содан кейін керек шкалаға көшеміз',
  mix:'Барлық шамалардан аралас',
  task:'Тапсырма', check:'Тексеру', hint:'Кеңес', next:'Келесі тапсырма',
  ansPh:'Жауабыңыз', ansHelp:'Жауапты 20, 2,5, 7,2·10^4 немесе 7.2e4 түрінде жазуға болады. 1% дәлдікпен тексеріледі.',
  ok:'Дұрыс! Жарайсың.', bad:'Әзірге қате.', correctIs:'Дұрыс жауап:', empty:'Алдымен жауапты енгізіңіз.', parse:'Жауапты санмен жазыңыз: 20, 2,5 немесе 7,2·10^4.',
  hintIs:'Кеңес:', convert:'Түрлендіріңіз',
  scoreLbl:'Дұрыс', streakLbl:'Қатарынан',
  howPrac:'Жаттығу қалай өтеді',
  howPracText:'Жоғарыдан шаманы таңдаңыз немесе «аралас» режимді қосыңыз. Жауапты енгізіп, «Тексеру» батырмасын басыңыз (немесе Enter). Қате болса, толық шешімі шығады. Кеңес тек бірінші қадамды ашады.',
  prefTitle:'Халықаралық бірліктер жүйесінің (ХБЖ) еселік және үлестік қосымшалары',
  rulesTitle:'Түрлендірудің негізгі ережелері',
  thName:'Қосымша', thSym:'Белгісі', thPow:'Көбейткіш', thMean:'Мағынасы', thEx:'Мысал'
},
ru:{
  eyebrow:'Физика · 7–11 класс',
  title:'Конвертер физических величин',
  sub:'Переводит единицы друг в друга и показывает каждый шаг решения.',
  bigFont:'Крупный шрифт (для проектора)',
  mConv:'Конвертер', mPrac:'Тренажёр', mPref:'Приставки СИ',
  value:'Значение', from:'Из единицы', to:'В единицу', swap:'Поменять единицы местами', insPow:'Вставить степень 10',
  result:'Результат', std:'В стандартном виде:', plain:'Десятичная запись:', sig:'Значащих цифр:', copy:'Копировать', copied:'Скопировано ✓', copyFail:'Выделите текст и скопируйте вручную',
  steps:'Шаги решения', all:'Во всех единицах', allHint:'Нажмите на единицу — она подставится в поле «В единицу».',
  tip:'Запомни', si:'СИ', siUnit:'Единица СИ:', src:'дано',
  badInput:'Введите число: например 2,5, 3·10^5 или 3e5.',
  defA:'Выражаем исходную единицу через единицу СИ',
  defB:'Выражаем искомую единицу через единицу СИ',
  coef:'Находим коэффициент перевода',
  fin:'Умножаем данное значение на коэффициент',
  same:'Единицы одинаковые — перевод не нужен',
  tFormula:'Применяем формулу связи шкал',
  tFirst:'Сначала переходим к шкале Цельсия',
  tThen:'Затем переходим к нужной шкале',
  mix:'Смешанно из всех величин',
  task:'Задание', check:'Проверить', hint:'Подсказка', next:'Следующее задание',
  ansPh:'Ваш ответ', ansHelp:'Ответ можно записать как 20, 2,5, 7,2·10^4 или 7.2e4. Проверка с точностью 1%.',
  ok:'Верно! Молодец.', bad:'Пока неверно.', correctIs:'Правильный ответ:', empty:'Сначала введите ответ.', parse:'Запишите ответ числом: 20, 2,5 или 7,2·10^4.',
  hintIs:'Подсказка:', convert:'Переведите',
  scoreLbl:'Верно', streakLbl:'Подряд',
  howPrac:'Как работает тренажёр',
  howPracText:'Выберите величину сверху или включите смешанный режим. Введите ответ и нажмите «Проверить» (или Enter). При ошибке появится полное решение. Подсказка открывает только первый шаг.',
  prefTitle:'Кратные и дольные приставки Международной системы единиц (СИ)',
  rulesTitle:'Основные правила перевода',
  thName:'Приставка', thSym:'Обозначение', thPow:'Множитель', thMean:'Значение', thEx:'Пример'
}};

const GROUPS=[
  {id:'mech',n:{kk:'Механика негіздері',ru:'Основы механики'}},
  {id:'dyn',n:{kk:'Динамика және энергия',ru:'Динамика и энергия'}},
  {id:'heat',n:{kk:'Жылу',ru:'Теплота'}},
  {id:'el',n:{kk:'Электр',ru:'Электричество'}}
];

/* unit tuple: [id, symbol, name, factor-to-SI, opts]
   opts: x – rare (not used in practice); p:[baseFactor,'length',power]; eq:'q.u' equal unit;
         c:['q.u','q.u'] quotient; m:['q.u','q.u'] product; r:[n,'q.u'] n of another unit */
const Q=[
 {id:'length',g:'mech',ls:'l',n:{kk:'Ұзындық',ru:'Длина'},si:'m',def:['km','m'],u:[
  ['km','км','километр',1e3],['m','м','метр',1],['dm','дм','дециметр',0.1],['cm','см','сантиметр',0.01],['mm','мм','миллиметр',1e-3],
  ['um','мкм','микрометр',1e-6],['nm','нм','нанометр',1e-9],
  ['au',{kk:'а.б.',ru:'а.е.'},{kk:'астрономиялық бірлік',ru:'астрономическая единица'},1.495978707e11,{x:1}],
  ['ly',{kk:'ж.ж.',ru:'св. г.'},{kk:'жарық жылы',ru:'световой год'},9.4607e15,{x:1}]]},
 {id:'area',g:'mech',ls:'S',n:{kk:'Аудан',ru:'Площадь'},si:'m2',def:['cm2','m2'],
  tip:{kk:'Жиі кездесетін қате: 1 м = 100 см болғандықтан 1 м² = 100² см² = 10<sup>4</sup> см² (100 см² емес!). Аудан бірлігінде ұзындық коэффициенті квадратқа шығады.',
       ru:'Частая ошибка: раз 1 м = 100 см, то 1 м² = 100² см² = 10<sup>4</sup> см² (а не 100 см²). В единицах площади коэффициент длины возводится в квадрат.'},u:[
  ['km2','км²',{kk:'шаршы километр',ru:'квадратный километр'},1e6,{p:[1e3,'length',2]}],
  ['ha','га','гектар',1e4,{p:[100,'length',2]}],
  ['a','а',{kk:'ар (сотық)',ru:'ар (сотка)'},100,{p:[10,'length',2]}],
  ['m2','м²',{kk:'шаршы метр',ru:'квадратный метр'},1],
  ['dm2','дм²',{kk:'шаршы дециметр',ru:'квадратный дециметр'},1e-2,{p:[0.1,'length',2]}],
  ['cm2','см²',{kk:'шаршы сантиметр',ru:'квадратный сантиметр'},1e-4,{p:[0.01,'length',2]}],
  ['mm2','мм²',{kk:'шаршы миллиметр',ru:'квадратный миллиметр'},1e-6,{p:[1e-3,'length',2]}]]},
 {id:'volume',g:'mech',ls:'V',n:{kk:'Көлем',ru:'Объём'},si:'m3',def:['L','m3'],
  tip:{kk:'1 м³ = 100³ см³ = 10<sup>6</sup> см³. Литр — ХБЖ бірлігі емес: 1 л = 1 дм³ = 10<sup>−3</sup> м³, ал 1 мл = 1 см³.',
       ru:'1 м³ = 100³ см³ = 10<sup>6</sup> см³. Литр — не единица СИ: 1 л = 1 дм³ = 10<sup>−3</sup> м³, а 1 мл = 1 см³.'},u:[
  ['m3','м³',{kk:'текше метр',ru:'кубический метр'},1],
  ['dm3','дм³',{kk:'текше дециметр',ru:'кубический дециметр'},1e-3,{p:[0.1,'length',3]}],
  ['L','л','литр',1e-3,{eq:'volume.dm3'}],
  ['mL','мл','миллилитр',1e-6,{eq:'volume.cm3'}],
  ['cm3','см³',{kk:'текше сантиметр',ru:'кубический сантиметр'},1e-6,{p:[0.01,'length',3]}],
  ['mm3','мм³',{kk:'текше миллиметр',ru:'кубический миллиметр'},1e-9,{p:[1e-3,'length',3]}]]},
 {id:'mass',g:'mech',ls:'m',n:{kk:'Масса',ru:'Масса'},si:'kg',def:['g','kg'],
  tip:{kk:'Массаның ХБЖ бірлігі — килограмм (грамм емес!). Оның атауында «кило» қосымшасы бар, сондықтан 1 мг = 10<sup>−3</sup> г = 10<sup>−6</sup> кг.',
       ru:'Единица массы в СИ — килограмм (а не грамм!). В его названии уже есть приставка «кило», поэтому 1 мг = 10<sup>−3</sup> г = 10<sup>−6</sup> кг.'},u:[
  ['t','т','тонна',1e3],['q','ц','центнер',100],['kg','кг','килограмм',1],['g','г','грамм',1e-3],['mg','мг','миллиграмм',1e-6],['ug','мкг','микрограмм',1e-9]]},
 {id:'time',g:'mech',ls:'t',n:{kk:'Уақыт',ru:'Время'},si:'s',def:['h','s'],
  tip:{kk:'Уақыт ондық жүйеде емес: 1 сағ = 60 мин = 3600 с. Сондықтан 1,5 сағ = 1 сағ 30 мин (1 сағ 50 мин емес!).',
       ru:'Время не десятичное: 1 ч = 60 мин = 3600 с. Поэтому 1,5 ч = 1 ч 30 мин (а не 1 ч 50 мин!).'},u:[
  ['yr',{kk:'жыл',ru:'год'},{kk:'жыл (365 тәулік)',ru:'год (365 суток)'},31536000,{r:[365,'time.d']}],
  ['d',{kk:'тәул',ru:'сут'},{kk:'тәулік',ru:'сутки'},86400,{r:[24,'time.h']}],
  ['h',{kk:'сағ',ru:'ч'},{kk:'сағат',ru:'час'},3600,{r:[60,'time.min']}],
  ['min','мин',{kk:'минут',ru:'минута'},60],
  ['s','с',{kk:'секунд',ru:'секунда'},1],
  ['ms','мс',{kk:'миллисекунд',ru:'миллисекунда'},1e-3],
  ['us','мкс',{kk:'микросекунд',ru:'микросекунда'},1e-6]]},
 {id:'speed',g:'mech',ls:'υ',n:{kk:'Жылдамдық',ru:'Скорость'},si:'ms',def:['kmh','ms'],
  tip:{kk:'Тез тәсіл: км/сағ-тан м/с-қа көшу үшін 3,6-ға бөліңіз, кері бағытта 3,6-ға көбейтіңіз. Мысалы, 36 км/сағ = 10 м/с, 72 км/сағ = 20 м/с.',
       ru:'Быстрый способ: из км/ч в м/с делим на 3,6, обратно умножаем на 3,6. Например, 36 км/ч = 10 м/с, 72 км/ч = 20 м/с.'},u:[
  ['ms','м/с',{kk:'метр/секунд',ru:'метр в секунду'},1,{c:['length.m','time.s']}],
  ['kmh',{kk:'км/сағ',ru:'км/ч'},{kk:'километр/сағат',ru:'километр в час'},1/3.6,{c:['length.km','time.h']}],
  ['kms','км/с',{kk:'километр/секунд',ru:'километр в секунду'},1e3,{c:['length.km','time.s']}],
  ['cms','см/с',{kk:'сантиметр/секунд',ru:'сантиметр в секунду'},0.01,{c:['length.cm','time.s']}],
  ['mmin','м/мин',{kk:'метр/минут',ru:'метр в минуту'},1/60,{c:['length.m','time.min']}]]},
 {id:'accel',g:'mech',ls:'a',n:{kk:'Үдеу',ru:'Ускорение'},si:'ms2',def:['cms2','ms2'],u:[
  ['ms2','м/с²',{kk:'метр/секунд²',ru:'метр на секунду в квадрате'},1],
  ['cms2','см/с²',{kk:'сантиметр/секунд²',ru:'сантиметр на секунду в квадрате'},0.01],
  ['mms2','мм/с²',{kk:'миллиметр/секунд²',ru:'миллиметр на секунду в квадрате'},1e-3],
  ['g','g',{kk:'еркін түсу үдеуі (g ≈ 9,81)',ru:'ускорение свободного падения (g ≈ 9,81)'},9.81,{x:1}]]},
 {id:'density',g:'mech',ls:'ρ',n:{kk:'Тығыздық',ru:'Плотность'},si:'kgm3',def:['gcm3','kgm3'],
  tip:{kk:'1 г/см³ = 1000 кг/м³. Судың тығыздығы: 1 г/см³ = 1000 кг/м³ = 1 кг/л. Күрделі бірлікте алым мен бөлімді бөлек түрлендіреміз.',
       ru:'1 г/см³ = 1000 кг/м³. Плотность воды: 1 г/см³ = 1000 кг/м³ = 1 кг/л. В составной единице переводим числитель и знаменатель отдельно.'},u:[
  ['kgm3','кг/м³',null,1,{c:['mass.kg','volume.m3']}],
  ['gcm3','г/см³',null,1000,{c:['mass.g','volume.cm3']}],
  ['gm3','г/м³',null,1e-3,{c:['mass.g','volume.m3']}],
  ['kgdm3','кг/дм³',null,1000,{c:['mass.kg','volume.dm3']}],
  ['kgL','кг/л',null,1000,{c:['mass.kg','volume.L']}],
  ['gmL','г/мл',null,1000,{c:['mass.g','volume.mL']}],
  ['tm3','т/м³',null,1000,{c:['mass.t','volume.m3']}]]},

 {id:'force',g:'dyn',ls:'F',n:{kk:'Күш',ru:'Сила'},si:'N',def:['kN','N'],u:[
  ['MN','МН','меганьютон',1e6],['kN','кН','килоньютон',1e3],['N','Н','ньютон',1],['mN','мН','миллиньютон',1e-3],
  ['kgf','кгс',{kk:'килограмм-күш',ru:'килограмм-сила'},9.80665,{x:1}],['dyn','дин','дина',1e-5,{x:1}]]},
 {id:'pressure',g:'dyn',ls:'p',n:{kk:'Қысым',ru:'Давление'},si:'Pa',def:['atm','Pa'],
  tip:{kk:'Қалыпты атмосфералық қысым: 1 атм = 760 мм сын. бағ. = 101 325 Па ≈ 10<sup>5</sup> Па. 1 мм сын. бағ. ≈ 133 Па.',
       ru:'Нормальное атмосферное давление: 1 атм = 760 мм рт. ст. = 101 325 Па ≈ 10<sup>5</sup> Па. 1 мм рт. ст. ≈ 133 Па.'},u:[
  ['MPa','МПа','мегапаскаль',1e6],['kPa','кПа','килопаскаль',1e3],['hPa','гПа','гектопаскаль',100],['Pa','Па','паскаль',1],
  ['bar','бар','бар',1e5],['atm','атм',{kk:'қалыпты атмосфера',ru:'нормальная атмосфера'},101325],
  ['mmHg',{kk:'мм сын. бағ.',ru:'мм рт. ст.'},{kk:'сынап бағанасының миллиметрі',ru:'миллиметр ртутного столба'},133.322],
  ['Ncm2','Н/см²',null,1e4,{c:['force.N','area.cm2']}]]},
 {id:'energy',g:'dyn',ls:'E',n:{kk:'Жұмыс, энергия',ru:'Работа, энергия'},si:'J',def:['kWh','J'],
  tip:{kk:'1 кВт·сағ = 1000 Вт · 3600 с = 3,6·10<sup>6</sup> Дж. Электр есептегіші энергияны осы бірлікпен өлшейді.',
       ru:'1 кВт·ч = 1000 Вт · 3600 с = 3,6·10<sup>6</sup> Дж. Именно в этих единицах электросчётчик измеряет энергию.'},u:[
  ['MJ','МДж','мегаджоуль',1e6],['kJ','кДж','килоджоуль',1e3],['J','Дж','джоуль',1],['mJ','мДж','миллиджоуль',1e-3],
  ['Wh',{kk:'Вт·сағ',ru:'Вт·ч'},{kk:'ватт-сағат',ru:'ватт-час'},3600,{m:['power.W','time.h']}],
  ['kWh',{kk:'кВт·сағ',ru:'кВт·ч'},{kk:'киловатт-сағат',ru:'киловатт-час'},3.6e6,{m:['power.kW','time.h']}],
  ['cal','кал','калория',4.1868],['kcal','ккал','килокалория',4186.8],
  ['eV','эВ','электронвольт',1.602176634e-19,{x:1}]]},
 {id:'power',g:'dyn',ls:'N',n:{kk:'Қуат',ru:'Мощность'},si:'W',def:['kW','W'],u:[
  ['MW','МВт','мегаватт',1e6],['kW','кВт','киловатт',1e3],['W','Вт','ватт',1],['mW','мВт','милливатт',1e-3],
  ['hp',{kk:'а.к.',ru:'л.с.'},{kk:'ат күші',ru:'лошадиная сила'},735.49875,{x:1}],
  ['Js','Дж/с',null,1,{c:['energy.J','time.s'],x:1}],
  ['kJmin','кДж/мин',null,1000/60,{c:['energy.kJ','time.min']}]]},

 {id:'temp',g:'heat',ls:'T',n:{kk:'Температура',ru:'Температура'},si:'K',def:['C','K'],temp:true,
  tip:{kk:'Температура көбейту арқылы емес, қосу арқылы түрлендіріледі: T = t + 273,15. Мектеп есептерінде көбіне 273 алынады. Температура айырмасы екі шкалада бірдей: Δt = 1 °C ⇔ ΔT = 1 К.',
       ru:'Температура переводится не умножением, а сложением: T = t + 273,15. В школьных задачах обычно берут 273. Разность температур в обеих шкалах одинакова: Δt = 1 °C ⇔ ΔT = 1 К.'},u:[
  ['C','°C',{kk:'Цельсий градусы',ru:'градус Цельсия'},1],['K','К','кельвин',1],['F','°F',{kk:'Фаренгейт градусы',ru:'градус Фаренгейта'},1]]},
 {id:'heatq',g:'heat',ls:'Q',n:{kk:'Жылу мөлшері',ru:'Количество теплоты'},si:'J',def:['kcal','J'],
  tip:{kk:'1 кал = 4,1868 Дж — 1 г суды 1 °C-қа қыздыруға кететін жылу. Тағам құндылығы «ккал» түрінде жазылады.',
       ru:'1 кал = 4,1868 Дж — теплота, нужная для нагрева 1 г воды на 1 °C. Калорийность пищи указывают в «ккал».'},u:[
  ['MJ','МДж','мегаджоуль',1e6],['kJ','кДж','килоджоуль',1e3],['J','Дж','джоуль',1],['cal','кал','калория',4.1868],['kcal','ккал','килокалория',4186.8]]},
 {id:'spheat',g:'heat',ls:'c',n:{kk:'Меншікті жылусыйымдылық',ru:'Удельная теплоёмкость'},si:'JkgC',def:['kJkgC','JkgC'],
  tip:{kk:'Температура айырмасы 1 °C пен 1 К бірдей, сондықтан Дж/(кг·°C) = Дж/(кг·К). Су үшін c = 4200 Дж/(кг·°C) = 4,2 кДж/(кг·°C) = 1 кал/(г·°C).',
       ru:'Разность в 1 °C равна разности в 1 К, поэтому Дж/(кг·°C) = Дж/(кг·К). Для воды c = 4200 Дж/(кг·°C) = 4,2 кДж/(кг·°C) = 1 кал/(г·°C).'},u:[
  ['JkgC','Дж/(кг·°C)',null,1],['kJkgC','кДж/(кг·°C)',null,1e3],['JgC','Дж/(г·°C)',null,1e3],
  ['calgC','кал/(г·°C)',null,4186.8],['kcalkgC','ккал/(кг·°C)',null,4186.8,{x:1}]]},
 {id:'latent',g:'heat',ls:'λ',n:{kk:'Меншікті жылу (λ, L, q)',ru:'Удельная теплота (λ, L, q)'},si:'Jkg',def:['MJkg','Jkg'],
  tip:{kk:'Бұл бірлік меншікті балқу жылуына (λ), булану жылуына (L) және отынның жану жылуына (q) ортақ. Мысалы, мұз үшін λ = 3,4·10<sup>5</sup> Дж/кг = 340 кДж/кг.',
       ru:'Эта единица общая для удельной теплоты плавления (λ), парообразования (L) и сгорания топлива (q). Например, для льда λ = 3,4·10<sup>5</sup> Дж/кг = 340 кДж/кг.'},u:[
  ['Jkg','Дж/кг',null,1,{c:['energy.J','mass.kg']}],['kJkg','кДж/кг',null,1e3,{c:['energy.kJ','mass.kg']}],
  ['MJkg','МДж/кг',null,1e6,{c:['energy.MJ','mass.kg']}],['Jg','Дж/г',null,1e3,{c:['energy.J','mass.g']}],
  ['calg','кал/г',null,4186.8,{c:['energy.cal','mass.g']}],['kcalkg','ккал/кг',null,4186.8,{c:['energy.kcal','mass.kg'],x:1}]]},

 {id:'current',g:'el',ls:'I',n:{kk:'Ток күші',ru:'Сила тока'},si:'A',def:['mA','A'],u:[
  ['kA','кА','килоампер',1e3],['A','А','ампер',1],['mA','мА','миллиампер',1e-3],['uA','мкА','микроампер',1e-6]]},
 {id:'voltage',g:'el',ls:'U',n:{kk:'Кернеу',ru:'Напряжение'},si:'V',def:['kV','V'],u:[
  ['MV','МВ','мегавольт',1e6],['kV','кВ','киловольт',1e3],['V','В','вольт',1],['mV','мВ','милливольт',1e-3],['uV','мкВ','микровольт',1e-6]]},
 {id:'resistance',g:'el',ls:'R',n:{kk:'Кедергі',ru:'Сопротивление'},si:'Ohm',def:['kOhm','Ohm'],u:[
  ['MOhm','МОм','мегаом',1e6],['kOhm','кОм','килоом',1e3],['Ohm','Ом','ом',1],['mOhm','мОм','миллиом',1e-3]]},
 {id:'charge',g:'el',ls:'q',n:{kk:'Электр заряды',ru:'Электрический заряд'},si:'C',def:['mAh','C'],
  tip:{kk:'Аккумулятор сыйымдылығы: 1 мА·сағ = 10<sup>−3</sup> А · 3600 с = 3,6 Кл. Элементар заряд e = 1,6·10<sup>−19</sup> Кл.',
       ru:'Ёмкость аккумулятора: 1 мА·ч = 10<sup>−3</sup> А · 3600 с = 3,6 Кл. Элементарный заряд e = 1,6·10<sup>−19</sup> Кл.'},u:[
  ['C','Кл','кулон',1],['mC','мКл','милликулон',1e-3],['uC','мкКл','микрокулон',1e-6],['nC','нКл','нанокулон',1e-9],
  ['Ah',{kk:'А·сағ',ru:'А·ч'},{kk:'ампер-сағат',ru:'ампер-час'},3600,{m:['current.A','time.h']}],
  ['mAh',{kk:'мА·сағ',ru:'мА·ч'},{kk:'миллиампер-сағат',ru:'миллиампер-час'},3.6,{m:['current.mA','time.h']}],
  ['e','e',{kk:'элементар заряд',ru:'элементарный заряд'},1.602176634e-19,{x:1}]]},
 {id:'capacitance',g:'el',ls:'C',n:{kk:'Электрсыйымдылық',ru:'Электроёмкость'},si:'F',def:['uF','F'],u:[
  ['F','Ф','фарад',1],['mF','мФ','миллифарад',1e-3],['uF','мкФ','микрофарад',1e-6],['nF','нФ','нанофарад',1e-9],['pF','пФ','пикофарад',1e-12]]}
];

/* index */
const QM={};
Q.forEach(q=>{q.map={};q.u=q.u.map(t=>{const u={id:t[0],s:t[1],nm:t[2],f:t[3],o:t[4]||{},q:q.id};q.map[u.id]=u;return u});QM[q.id]=q;});
const get=ref=>{const [qi,ui]=ref.split('.');return QM[qi].map[ui]};
const siOf=qid=>QM[qid].map[QM[qid].si];

/* ---------- state ---------- */
const st={lang:'kk',mode:'conv',q:'speed',a:'kmh',b:'ms',sig:4};
try{const l=localStorage.getItem('pc-lang');if(l==='kk'||l==='ru')st.lang=l;}catch(e){}
// Сайттың тілі орысша не қазақша болса, түрлендіргіш те сол тілде ашылады
{const sl=document.documentElement.lang;if(sl==='ru'||sl==='kk')st.lang=sl;}
try{if(localStorage.getItem('pc-big')==='1')document.documentElement.classList.add('big');}catch(e){}

const L=x=>x==null?'':(typeof x==='string'?x:x[st.lang]);
const t=k=>T[st.lang][k];
const sym=u=>L(u.s);
const U=s=>`<span class="uc-u">${s}</span>`;
const $=id=>document.getElementById(id);

/* ---------- numbers ---------- */
const clean=v=>v===0?0:Number(v.toPrecision(12));
const trimZ=s=>s.indexOf('.')>=0?s.replace(/\.?0+$/,''):s;
function group(i){const neg=i[0]==='-';let d=neg?i.slice(1):i;if(d.length>4)d=d.replace(/\B(?=(\d{3})+(?!\d))/g,' ');return (neg?'−':'')+d;}
function plain(v,n){
  if(v===0)return '0';
  const r=Number(v.toPrecision(n));const e=Math.floor(Math.log10(Math.abs(r)));
  const dec=Math.max(0,Math.min(15,n-1-e));const s=trimZ(r.toFixed(dec));const p=s.split('.');
  return group(p[0])+(p[1]?','+p[1]:'');
}
const supE=e=>`10<sup>${e<0?'−'+(-e):e}</sup>`;
function sci(v,n){
  if(v===0)return '0';
  let e=Math.floor(Math.log10(Math.abs(v)));let m=Number((v/Math.pow(10,e)).toPrecision(n));
  if(Math.abs(m)>=10){m=Number((m/10).toPrecision(n));e++;}
  if(Math.abs(m)<1){m=Number((m*10).toPrecision(n));e--;}
  const ms=trimZ(String(m)).replace('.',',').replace('-','−');
  if(e===0)return ms;
  if(m===1)return supE(e);
  if(m===-1)return '−'+supE(e);
  return ms+'·'+supE(e);
}
function auto(v,n){if(v===0)return '0';const a=Math.abs(v);return (a>=1e-3&&a<1e6)?plain(v,n):sci(v,n);}
function fac(f){
  f=clean(f);
  if(f>0){const l=Math.log10(f);if(Math.abs(l-Math.round(l))<1e-9){const n=Math.round(l);return Math.abs(n)<2?plain(f,6):supE(n);}}
  return auto(f,6);
}
const isApprox=(v,n)=>Number(clean(v).toPrecision(n))!==clean(v);
const frac=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const paren=(s,v)=>v<0?`(${s})`:s;

const SUPMAP={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
function parseNum(s){
  if(s==null)return NaN;
  s=String(s).trim().replace(/[\s ]/g,'').replace(/[−–]/g,'-').replace(/,/g,'.');
  s=s.replace(/10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,(m,p)=>'10^'+[...p].map(c=>SUPMAP[c]).join(''));
  if(!s)return NaN;
  if(/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s))return Number(s);
  const m=s.match(/^([+-])?(\d+\.?\d*|\.\d+)?[·⋅*×xхX]?10\^\(?([+-]?\d+)\)?$/);
  if(m){const v=Number((m[2]||'1')+'e'+m[3]);return m[1]==='-'?-v:v;}
  return NaN;
}

/* ---------- conversion ---------- */
function toK(x,id){return id==='K'?x:id==='C'?x+273.15:(x-32)/1.8+273.15;}
function fromK(T,id){return id==='K'?T:id==='C'?T-273.15:(T-273.15)*1.8+32;}
function convert(q,x,a,b){
  if(q.temp)return clean(fromK(toK(x,a.id),b.id));
  return clean(x*a.f/b.f);
}

/* definition chain: 1 u = ... = f SI */
function chain(u){
  const q=QM[u.q],S=sym(siOf(u.q));const parts=[['',`1 ${U(sym(u))}`]];
  let v=u;
  if(u.o.eq){v=get(u.o.eq);parts.push(['=',`1 ${U(sym(v))}`]);}
  if(v.o.p){const [bf,bq,pw]=v.o.p;parts.push(['=',`(${fac(bf)} ${U(sym(siOf(bq)))})<sup>${pw}</sup>`]);}
  else if(v.o.c||v.o.m){
    const [ra,rb]=v.o.c||v.o.m;const A=get(ra),B=get(rb);const dot=!!v.o.m;
    const one=dot?`1 ${U(sym(A))} · 1 ${U(sym(B))}`:frac(`1 ${U(sym(A))}`,`1 ${U(sym(B))}`);
    const two=dot?`${fac(A.f)} ${U(sym(siOf(A.q)))} · ${fac(B.f)} ${U(sym(siOf(B.q)))}`:frac(`${fac(A.f)} ${U(sym(siOf(A.q)))}`,`${fac(B.f)} ${U(sym(siOf(B.q)))}`);
    parts.push(['=',one]);if(two!==one)parts.push(['=',two]);
  } else if(v.o.r){
    const [n,ref]=v.o.r;const R=get(ref);parts.push(['=',`${n} ${U(sym(R))}`]);
    if(R.id!==q.si)parts.push(['=',`${n} · ${fac(R.f)} ${U(S)}`]);
  }
  parts.push([isApprox(u.f,6)?'≈':'=',`${fac(u.f)} ${U(S)}`]);
  return parts;
}

function buildSteps(q,x,a,b,sig){
  const out=[];const r=convert(q,x,a,b);
  const xs=paren(auto(x,10),x);
  const op=isApprox(r,sig)?'≈':'=';
  if(a.id===b.id){out.push({lab:t('same'),parts:[['',`${xs} ${U(sym(a))}`],['=',`<mark>${auto(r,sig)}</mark> ${U(sym(b))}`]]});return out;}
  if(q.temp){
    const fm={
      CK:['<i class="v">T</i> = <i class="v">t</i> + 273,15',v=>`${paren(auto(v,10),v)} + 273,15`],
      KC:['<i class="v">t</i> = <i class="v">T</i> − 273,15',v=>`${auto(v,10)} − 273,15`],
      CF:['<i class="v">t</i><sub>F</sub> = 1,8 · <i class="v">t</i> + 32',v=>`1,8 · ${paren(auto(v,10),v)} + 32`],
      FC:['<i class="v">t</i> = (<i class="v">t</i><sub>F</sub> − 32) : 1,8',v=>`(${auto(v,10)} − 32) : 1,8`]
    };
    const one=(from,to,val,lab,last)=>{
      const k=from+to,res=clean(fromK(toK(val,from),to)),uS=sym(QM.temp.map[to]);
      const shown=last?`<mark>${auto(res,sig)}</mark> ${U(uS)}`:`${auto(res,sig+2)} ${U(uS)}`;
      out.push({lab,parts:[['',fm[k][0]]],sub:[['',fm[k][1](val)],[last?op:'=',shown]]});
      return res;
    };
    if((a.id==='C')||(b.id==='C')) one(a.id,b.id,x,t('tFormula'),true);
    else{const c=one(a.id,'C',x,t('tFirst'),false);one('C',b.id,c,t('tThen'),true);}
    return out;
  }
  const S=sym(siOf(q.id));const f1=a.f,f2=b.f;const k=clean(f1/f2);
  if(a.id!==q.si)out.push({lab:t('defA'),parts:chain(a)});
  if(b.id!==q.si)out.push({lab:t('defB'),parts:chain(b)});
  if(b.id!==q.si){
    const num=a.id===q.si?`1 ${U(S)}`:`${fac(f1)} ${U(S)}`;
    out.push({lab:t('coef'),parts:[['','<i class="v">k</i>'],['=',frac(num,`${fac(f2)} ${U(S)}`)],[isApprox(k,6)?'≈':'=',fac(k)]]});
  }
  const fin=[['',`${xs} ${U(sym(a))}`]];
  if(k!==1)fin.push(['=',`${xs} · ${fac(k)} ${U(sym(b))}`]);
  fin.push([op,`<mark>${auto(r,sig)}</mark> ${U(sym(b))}`]);
  out.push({lab:t('fin'),parts:fin});
  return out;
}
const mline=parts=>`<div class="m">${parts.map(([o,h])=>(o?`<span class="uc-op">${o}</span>`:'')+`<span>${h}</span>`).join('')}</div>`;
function renderSteps(el,steps){
  el.innerHTML=steps.map(s=>`<li><div><div class="uc-lab">${s.lab}</div>${mline(s.parts)}${s.sub?mline(s.sub):''}</div></li>`).join('');
}

/* ---------- static text ---------- */
function applyI18n(){
  // html lang атрибутын сайт өзі қояды (тіл ауыстырғыш)
  document.querySelectorAll('[data-t]').forEach(el=>{el.textContent=t(el.dataset.t);});
  document.querySelectorAll('[data-tp]').forEach(el=>{const [a,k]=el.dataset.tp.split(':');el.setAttribute(a,t(k));});
  $('lang-kk').setAttribute('aria-pressed',st.lang==='kk');$('lang-ru').setAttribute('aria-pressed',st.lang==='ru');
}

/* ---------- rail ---------- */
function renderRail(){
  $('rail').innerHTML=GROUPS.map(g=>`<div class="uc-group"><h2>${L(g.n)}</h2><div class="uc-chips">${
    Q.filter(q=>q.g===g.id).map(q=>`<button type="button" class="uc-chip" data-q="${q.id}" aria-pressed="${q.id===st.q}"><span class="ls">${q.ls}</span>${L(q.n)}</button>`).join('')
  }</div></div>`).join('');
}
$('rail').addEventListener('click',e=>{
  const b=e.target.closest('.uc-chip');if(!b)return;
  setQ(b.dataset.q);
});
function setQ(id){
  const q=QM[id];st.q=id;st.a=q.def[0];st.b=q.def[1];
  if(q.temp&&isNaN(parseNum($('val').value)))$('val').value='20';
  renderRail();
  if(st.mode==='conv')renderConv();
  else if(st.mode==='prac'){$('mix').checked=false;newTask();}
}

/* ---------- converter ---------- */
const optText=(q,u)=>{const n=L(u.nm);return sym(u)+(n?` — ${n}`:'')+(u.id===q.si?` (${t('si')})`:'');};
function fillSelects(){
  const q=QM[st.q];
  const html=q.u.map(u=>`<option value="${u.id}">${optText(q,u)}</option>`).join('');
  $('from').innerHTML=html;$('to').innerHTML=html;$('from').value=st.a;$('to').value=st.b;
}
let lastCopy='';
function renderConv(){
  const q=QM[st.q];fillSelects();
  $('qtitle').innerHTML=`<span class="ls">${q.ls}</span><b>${L(q.n)}</b><span class="siu">${t('siUnit')} ${sym(siOf(q.id))}</span>`;
  const tip=q.tip?L(q.tip):'';$('tipCard').hidden=!tip;$('tipText').innerHTML=tip;
  const x=parseNum($('val').value);const a=q.map[st.a],b=q.map[st.b];
  if(!isFinite(x)){
    $('rbig').innerHTML=`<span class="uc-err" style="font-size:1rem;font-family:var(--f-body)">${t('badInput')}</span>`;
    $('rsmall').innerHTML='';$('steps').innerHTML='';$('allgrid').innerHTML='';lastCopy='';return;
  }
  const r=convert(q,x,a,b),sig=st.sig;
  $('rbig').innerHTML=`<span class="lhs">${auto(x,10)} ${sym(a)} ${isApprox(r,sig)?'≈':'='}</span><mark>${auto(r,sig)}</mark> <span class="uc-u">${sym(b)}</span>`;
  const ar=Math.abs(r);const sm=[`<span>${t('std')} <b>${sci(r,sig)}</b></span>`];
  if(r!==0&&(ar<1e-3||ar>=1e6)&&ar>1e-12&&ar<1e15)sm.push(`<span>${t('plain')} <b>${plain(r,sig)}</b></span>`);
  $('rsmall').innerHTML=sm.join('');
  lastCopy=`${auto(x,10)} ${sym(a)} = ${sci(r,sig)} ${sym(b)}`;
  renderSteps($('steps'),buildSteps(q,x,a,b,sig));
  $('allgrid').innerHTML=q.u.map(u=>{
    const v=convert(q,x,a,u);const cls=u.id===st.b?'uc-on':(u.id===st.a?'uc-src':'');
    return `<button type="button" class="cell ${cls}" data-u="${u.id}">${u.id===st.a?`<span class="uc-tag">${t('src')}</span>`:''}<span class="cv">${auto(v,sig)} ${U(sym(u))}</span><span class="cn">${L(u.nm)||sym(u)}${u.id===q.si?' · '+t('si'):''}</span></button>`;
  }).join('');
}
$('val').addEventListener('input',renderConv);
$('from').addEventListener('change',e=>{st.a=e.target.value;renderConv();});
$('to').addEventListener('change',e=>{st.b=e.target.value;renderConv();});
$('swap').addEventListener('click',()=>{[st.a,st.b]=[st.b,st.a];renderConv();});
$('allgrid').addEventListener('click',e=>{const c=e.target.closest('.cell');if(!c)return;st.b=c.dataset.u;renderConv();});
$('sigSeg').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;st.sig=Number(b.dataset.sig);
  $('sigSeg').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderConv();
});
function insertPow(inp){
  const s=inp.selectionStart??inp.value.length,e=inp.selectionEnd??s;
  inp.value=inp.value.slice(0,s)+'·10^'+inp.value.slice(e);const p=s+4;inp.focus();
  try{inp.setSelectionRange(p,p);}catch(err){}
  inp.dispatchEvent(new Event('input'));
}
$('insPow').addEventListener('click',()=>insertPow($('val')));
$('insPow2').addEventListener('click',()=>insertPow($('ans')));
$('copyBtn').addEventListener('click',()=>{
  if(!lastCopy)return;
  const txt=lastCopy.replace(/<sup>(.*?)<\/sup>/g,'^$1').replace(/<[^>]+>/g,'').replace(/ /g,' ');
  const btn=$('copyBtn');
  const done=m=>{btn.textContent=m;setTimeout(()=>{btn.textContent=t('copy');},1600);};
  try{navigator.clipboard.writeText(txt).then(()=>done(t('copied')),()=>done(t('copyFail')));}catch(err){done(t('copyFail'));}
});

/* ---------- practice ---------- */
const pr={c:0,n:0,streak:0,task:null,checked:false};
const NICE=[2,3,4,5,6,8,12,15,18,20,25,36,45,54,72,90,108,120,150,250,400,500,750,1.5,2.5,0.4,0.25,7.8,2.7,13.6];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function newTask(){
  const pool=$('mix').checked?Q:[QM[st.q]];
  let task=null;
  for(let i=0;i<60&&!task;i++){
    const q=pick(pool);const us=q.u.filter(u=>!u.o.x);if(us.length<2)continue;
    const a=pick(us),b=pick(us);if(a.id===b.id)continue;
    let x;
    if(q.temp){x=a.id==='K'?pick([0,77,200,253,273,300,373,500]):a.id==='F'?pick([-40,14,32,50,68,98.6,212]):pick([-40,-20,-10,0,15,20,25,37,100,250]);}
    else{const k=a.f/b.f;if(k>1e9||k<1e-9)continue;x=pick(NICE);}
    task={q,a,b,x,r:convert(q,x,a,b)};
  }
  pr.task=task;pr.checked=false;
  $('ans').value='';$('fb').hidden=true;$('pStepsCard').hidden=true;
  renderTask();$('ans').focus({preventScroll:true});
}
function renderTask(){
  const k=pr.task;if(!k)return;
  $('taskQ').innerHTML=`<span class="qn">${t('convert')} · ${L(k.q.n)}</span>${auto(k.x,10)} ${U(sym(k.a))} = <span class="qm">?</span> ${U(sym(k.b))}`;
  $('ansUnit').textContent=sym(k.b);
  $('score').innerHTML=`<span class="uc-pill">${t('scoreLbl')}: ${pr.c} / ${pr.n}</span>${pr.streak>1?`<span class="uc-pill streak">${t('streakLbl')}: ${pr.streak}</span>`:''}`;
}
function showSolution(){
  const k=pr.task;renderSteps($('pSteps'),buildSteps(k.q,k.x,k.a,k.b,4));$('pStepsCard').hidden=false;
}
function check(){
  const k=pr.task;if(!k)return;const fb=$('fb');
  if(pr.checked){newTask();return;}
  const raw=$('ans').value.trim();
  if(!raw){fb.className='fb uc-info';fb.innerHTML=t('empty');fb.hidden=false;return;}
  const v=parseNum(raw);
  if(!isFinite(v)){fb.className='fb uc-info';fb.innerHTML=t('parse');fb.hidden=false;return;}
  let ok=Math.abs(v-k.r)<=Math.max(Math.abs(k.r)*0.01,1e-300);
  if(!ok&&k.q.temp){
    const alt=(k.a.id==='C'&&k.b.id==='K')?k.x+273:(k.a.id==='K'&&k.b.id==='C')?k.x-273:null;
    ok=Math.abs(v-k.r)<=0.6||(alt!==null&&Math.abs(v-alt)<1e-9);
  }
  pr.n++;pr.checked=true;
  const corr=`${sci(k.r,4)} ${U(sym(k.b))}${(Math.abs(k.r)>=1e-3&&Math.abs(k.r)<1e6&&sci(k.r,4)!==plain(k.r,4))?` = ${plain(k.r,4)} ${U(sym(k.b))}`:''}`;
  if(ok){pr.c++;pr.streak++;fb.className='fb uc-ok';fb.innerHTML=`${t('ok')}<div class="m">${t('correctIs')} ${corr}</div>`;}
  else{pr.streak=0;fb.className='fb uc-bad';fb.innerHTML=`${t('bad')}<div class="m">${t('correctIs')} ${corr}</div>`;}
  fb.hidden=false;showSolution();renderTask();
}
$('checkBtn').addEventListener('click',check);
$('nextBtn').addEventListener('click',newTask);
$('ans').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();check();}});
$('hintBtn').addEventListener('click',()=>{
  const k=pr.task;if(!k)return;const s=buildSteps(k.q,k.x,k.a,k.b,4)[0];
  const fb=$('fb');fb.className='fb uc-info';
  fb.innerHTML=`${t('hintIs')} ${s.lab.toLowerCase()}.${s.sub?mline(s.parts):mline(s.parts.filter(p=>p[1].indexOf('<mark>')<0))}`;fb.hidden=false;
});
$('mix').addEventListener('change',newTask);

/* ---------- prefixes ---------- */
const PREF=[
  ['тера','Т',12,{kk:'триллион',ru:'триллион'},'1 ТВт = 10<sup>12</sup> Вт'],
  ['гига','Г',9,{kk:'миллиард',ru:'миллиард'},'1 ГВт = 10<sup>9</sup> Вт'],
  ['мега','М',6,{kk:'миллион',ru:'миллион'},'1 МПа = 10<sup>6</sup> Па'],
  ['кило','к',3,{kk:'мың',ru:'тысяча'},'1 км = 10<sup>3</sup> м'],
  ['гекто','г',2,{kk:'жүз',ru:'сто'},'1 гПа = 10<sup>2</sup> Па'],
  ['дека','да',1,{kk:'он',ru:'десять'},'1 дал = 10 л'],
  ['—','—',0,{kk:'негізгі бірлік',ru:'основная единица'},'1 м, 1 Па, 1 Дж'],
  ['деци','д',-1,{kk:'оннан бір',ru:'одна десятая'},'1 дм = 10<sup>−1</sup> м'],
  ['санти','с',-2,{kk:'жүзден бір',ru:'одна сотая'},'1 см = 10<sup>−2</sup> м'],
  ['милли','м',-3,{kk:'мыңнан бір',ru:'одна тысячная'},'1 мА = 10<sup>−3</sup> А'],
  ['микро','мк',-6,{kk:'миллионнан бір',ru:'одна миллионная'},'1 мкФ = 10<sup>−6</sup> Ф'],
  ['нано','н',-9,{kk:'миллиардтан бір',ru:'одна миллиардная'},'1 нм = 10<sup>−9</sup> м'],
  ['пико','п',-12,{kk:'триллионнан бір',ru:'одна триллионная'},'1 пФ = 10<sup>−12</sup> Ф']
];
const RULES={
kk:[
  ['Қосымша — бірліктің алдына жазылатын көбейткіш. «Кило» = 10<sup>3</sup>, сондықтан:','1 км = 10<sup>3</sup> м,&nbsp;&nbsp; 5 кН = 5·10<sup>3</sup> Н'],
  ['Аудан мен көлемде қосымша да дәрежеге шығады:','1 см² = (10<sup>−2</sup> м)² = 10<sup>−4</sup> м²,&nbsp;&nbsp; 1 см³ = (10<sup>−2</sup> м)³ = 10<sup>−6</sup> м³'],
  ['Күрделі бірлікте алымы мен бөлімін бөлек түрлендіреміз (алмастыру әдісі):','72 км/сағ = '+frac('72 · 10<sup>3</sup> м','3600 с')+' = 20 м/с'],
  ['Есептің жауабын стандарт түрде жазамыз: a·10<sup>n</sup>, мұнда 1 ≤ a &lt; 10.','0,00052 м = 5,2·10<sup>−4</sup> м,&nbsp;&nbsp; 340 000 Дж/кг = 3,4·10<sup>5</sup> Дж/кг'],
  ['Дәрежелерді көбейткенде көрсеткіштер қосылады, бөлгенде азайтылады:','10<sup>3</sup> · 10<sup>−2</sup> = 10<sup>1</sup>,&nbsp;&nbsp; '+frac('10<sup>−3</sup>','10<sup>−6</sup>')+' = 10<sup>3</sup>']
],
ru:[
  ['Приставка — это множитель перед единицей. «Кило» = 10<sup>3</sup>, поэтому:','1 км = 10<sup>3</sup> м,&nbsp;&nbsp; 5 кН = 5·10<sup>3</sup> Н'],
  ['В площади и объёме приставка тоже возводится в степень:','1 см² = (10<sup>−2</sup> м)² = 10<sup>−4</sup> м²,&nbsp;&nbsp; 1 см³ = (10<sup>−2</sup> м)³ = 10<sup>−6</sup> м³'],
  ['В составной единице числитель и знаменатель переводим отдельно (метод подстановки):','72 км/ч = '+frac('72 · 10<sup>3</sup> м','3600 с')+' = 20 м/с'],
  ['Ответ записываем в стандартном виде: a·10<sup>n</sup>, где 1 ≤ a &lt; 10.','0,00052 м = 5,2·10<sup>−4</sup> м,&nbsp;&nbsp; 340 000 Дж/кг = 3,4·10<sup>5</sup> Дж/кг'],
  ['При умножении степеней показатели складываются, при делении вычитаются:','10<sup>3</sup> · 10<sup>−2</sup> = 10<sup>1</sup>,&nbsp;&nbsp; '+frac('10<sup>−3</sup>','10<sup>−6</sup>')+' = 10<sup>3</sup>']
]};
function renderPref(){
  $('prefT').innerHTML=`<thead><tr><th>${t('thName')}</th><th>${t('thSym')}</th><th>${t('thPow')}</th><th>${t('thMean')}</th><th>${t('thEx')}</th></tr></thead><tbody>${
    PREF.map(p=>`<tr class="${p[2]===0?'uc-base':''}"><td>${p[0]}</td><td class="uc-sym">${p[1]}</td><td class="pw">${p[2]===0?'1':supE(p[2])}</td><td>${L(p[3])}</td><td>${p[4]}</td></tr>`).join('')}</tbody>`;
  $('rules').innerHTML=RULES[st.lang].map(r=>`<li><div><p>${r[0]}</p><div class="m">${r[1]}</div></div></li>`).join('');
}

/* ---------- modes & global ---------- */
function setMode(m){
  st.mode=m;
  document.querySelectorAll('.modes button').forEach(b=>b.setAttribute('aria-selected',b.dataset.mode===m));
  $('p-conv').hidden=m!=='conv';$('p-prac').hidden=m!=='prac';$('p-pref').hidden=m!=='pref';$('rail').hidden=m==='pref';
  if(m==='conv')renderConv();
  if(m==='prac'){if(!pr.task||(!$('mix').checked&&pr.task.q.id!==st.q))newTask();else renderTask();}
  if(m==='pref')renderPref();
}
document.querySelector('.modes').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setMode(b.dataset.mode);});
function setLang(l){
  st.lang=l;try{localStorage.setItem('pc-lang',l);}catch(e){}
  applyI18n();renderRail();renderConv();renderPref();
  if(pr.task){renderTask();if(!$('pStepsCard').hidden)showSolution();$('fb').hidden=true;}
}
$('lang-kk').addEventListener('click',()=>setLang('kk'));
$('lang-ru').addEventListener('click',()=>setLang('ru'));
$('bigBtn').addEventListener('click',()=>{
  const on=document.documentElement.classList.toggle('big');$('bigBtn').setAttribute('aria-pressed',on);
  try{localStorage.setItem('pc-big',on?'1':'0');}catch(e){}
});
$('bigBtn').setAttribute('aria-pressed',document.documentElement.classList.contains('big'));

applyI18n();renderRail();renderConv();
})();
