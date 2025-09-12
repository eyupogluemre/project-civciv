const myInput = document.getElementById('text');
const btnKullan = document.getElementById('btn-kullan');
const menuIcon = document.getElementById('menu-icon')
const mainMenu = document.getElementById('main-menu')
const btnClose = document.getElementById('btn-close')
const expandedMenu = document.getElementById('expanded-menu');

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

  menuIcon.addEventListener('click', function(){
        mainMenu.style.display = "none"
        expandedMenu.style.display = "flex"
        
  })

  btnClose.addEventListener('click', function(){
        expandedMenu.style.display = "none"
        mainMenu.style.display = "flex"
  })