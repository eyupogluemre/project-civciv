const myInput = document.getElementById('text');
const btnKullan = document.getElementById('btn-kullan');

  myInput.addEventListener('input', function() {
    myInput.value = myInput.value.toUpperCase();
  });

  btnKullan.addEventListener('click', function(){
    if(myInput.value === "AABB1997"){
        window.location.href = 'index2.html'
    } else if(myInput.value === ""){
        alert('Gerekli alanı doldur!')
    } else {
        myInput.value = ""
        alert('Hatalı bir kod girdin!')
    }
  })