const element = document.getElementById("mobileHeader");
const sideBar = document.getElementById("sideBar");
const elementClose = document.getElementById("close");

element.addEventListener("click", () => {
  sideBar.classList.add("open");
});

elementClose.addEventListener("click", () => {
  sideBar.classList.remove("open");
});







console.log(element, sideBar, elementClose);
console.log("i love you")