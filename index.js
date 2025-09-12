const menuIcon = document.getElementById('menu-icon')
const mainMenu = document.getElementById('main-menu')
const btnClose = document.getElementById('btn-close')
const expandedMenu = document.getElementById('expanded-menu');

  menuIcon.addEventListener('click', function(){
        mainMenu.style.display = "none"
        expandedMenu.style.display = "flex"
  })

  btnClose.addEventListener('click', function(){
        expandedMenu.style.display = "none"
        mainMenu.style.display = "flex"
  })