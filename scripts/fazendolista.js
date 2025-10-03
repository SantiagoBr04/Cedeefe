const alternativas = document.querySelectorAll('.alternativas');

alternativas.forEach(alt => {
  alt.addEventListener('click', () => {

    alternativas.forEach(a => a.classList.remove('selecionada'));

    alt.classList.add('selecionada');
  });
});
