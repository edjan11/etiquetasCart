// ===============================
// 🌈 Estado global + elementos de UI
// ===============================

const cores = getComputedStyle(document.documentElement)
  .getPropertyValue('--colors')
  .split(',')
  .map(c => c.trim());

const TTL = 10 * 24 * 60 * 60 * 1000; // ainda definido, mas não usado
let currentSessionId = null;
let escrevente = '';
let pendentesOnly = false;

const form = document.getElementById('formUpload');
const fileInput = document.getElementById('fileInput');
const sessionSelect = document.getElementById('sessionSelect');
const loadBtn = document.getElementById('btnCarregarSessao');
const archivedSessionSelect = document.getElementById('archivedSessionSelect');
const loadArchivedBtn = document.getElementById('btnCarregarArquivada');
const escreventeSelect = document.getElementById('escreventeSelect');
const busca = document.getElementById('buscaComunicados');
const filtroBtn = document.getElementById('filtroPendentes');
const container = document.getElementById('resultados');
const resumoEl = document.getElementById('resumoErros');
const listaNomes = document.getElementById('listaNomes');
const toggleListaNomes = document.getElementById('toggleListaNomes');
const listaConjuges = document.getElementById('listaConjuges');
const exportarPDFBtn = document.getElementById('exportarPDF');

// ===============================
// 🌙 Tema persistente
// ===============================

const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeToggle.textContent = '☀';
}
themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀' : '☾';
});

// toggle da lista lateral de cônjuges
toggleListaNomes.addEventListener('click', () => {
  if (listaConjuges.style.display === 'none') {
    listaConjuges.style.display = 'block';
  } else {
    listaConjuges.style.display = 'none';
  }
});
