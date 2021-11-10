var io = io({
    transports: ['websocket'],
    upgrade: false
});

console.log(io);
io.on('connection',(socket)=>{
    console.log(socket);
})

let noteTab = document.getElementById("topNavNoteOptsButton");
let patternTab = document.getElementById("topNavPatternOptsButton");
let generalTab = document.getElementById("topNavGeneralOptsButton");
let noteOptionsView = document.getElementById("noteOptsView");
let patternOptionsView = document.getElementById("patternOptsView");
let generalOptionsView = document.getElementById("generalOptsView");
noteTab.addEventListener("click",()=>{
    patternOptionsView.classList.add("hidden");
    generalOptionsView.classList.add("hidden");
    noteOptionsView.classList.remove("hidden");
})
patternTab.addEventListener("click",()=>{
    patternOptionsView.classList.remove("hidden");
    generalOptionsView.classList.add("hidden");
    noteOptionsView.classList.add("hidden");
})
generalTab.addEventListener("click",()=>{
    patternOptionsView.classList.add("hidden");
    generalOptionsView.classList.remove("hidden");
    noteOptionsView.classList.add("hidden");
})

