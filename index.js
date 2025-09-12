const menuIcon = document.getElementById('menu-icon')
const mainMenu = document.getElementById('main-menu')
const btnClose = document.getElementById('btn-close')
const expandedMenu = document.getElementById('expanded-menu');
const btnRedeem = document.getElementById('btn-redeem')

  menuIcon.addEventListener('click', function(){
        mainMenu.style.display = "none"
        expandedMenu.style.display = "flex"
        
  })

  btnClose.addEventListener('click', function(){
        expandedMenu.style.display = "none"
        mainMenu.style.display = "flex"
  })

  btnRedeem.addEventListener('click', function(){
      window.location.href = 'redeem.html'
  })