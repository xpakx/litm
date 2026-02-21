(() => {
    const helloDiv = document.createElement('div');
    helloDiv.textContent = 'Hello World';
    helloDiv.style = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; color: #fdd; font-size: 3rem;";
    const app = document.getElementById("app"); 
    if (!app) return;
    app.appendChild(helloDiv);
})();
