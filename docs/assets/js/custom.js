(function () {
  "use strict";

  const modules = [
    {
      path: "azure",
      title: "Terraform con Azure"
    },
    {
      path: "aws",
      title: "Terraform con AWS"
    }
  ];

  const defaultTitle = "Curso de Terraform";

  let refreshTimers = [];

  function getModuleTitle() {
    /*
     * Comparamos segmentos completos de la URL.
     *
     * Ejemplos:
     * /startusingterraform/azure/01-01-introduccion-iac/
     * /startusingterraform/aws/02-04-primer-despliegue-bucket-s3/
     *
     * Funciona tanto en GitHub Pages como en mkdocs serve.
     */
    const pathSegments = window.location.pathname
      .split("/")
      .filter(Boolean);

    const selectedModule = modules.find(function (module) {
      return pathSegments.includes(module.path);
    });

    return selectedModule ? selectedModule.title : defaultTitle;
  }

  function updateSidebarTitle() {
    /*
     * Seleccionamos únicamente el título de la navegación principal,
     * sin modificar los títulos de bloques o subsecciones.
     */
    const sidebarTitle = document.querySelector(
      ".md-sidebar--primary .md-nav--primary > .md-nav__title"
    );

    if (!sidebarTitle) {
      return;
    }

    const title = getModuleTitle();

    /*
     * Modificamos solo los nodos de texto directos.
     * Conservamos el logotipo, los enlaces y los iconos.
     */
    const textNodes = Array.from(sidebarTitle.childNodes).filter(
      function (node) {
        return (
          node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim() !== ""
        );
      }
    );

    if (textNodes.length > 0) {
      const newText = "\n" + title + "\n";

      if (textNodes[0].textContent !== newText) {
        textNodes[0].textContent = newText;
      }

      // Eliminamos posibles textos adicionales del título anterior.
      textNodes.slice(1).forEach(function (node) {
        node.textContent = "";
      });
    } else {
      sidebarTitle.appendChild(
        document.createTextNode("\n" + title + "\n")
      );
    }
  }

  function initialize() {
    /*
     * Evitamos acumular temporizadores si Material emite
     * varias actualizaciones seguidas.
     */
    refreshTimers.forEach(function (timer) {
      window.clearTimeout(timer);
    });

    refreshTimers = [];

    updateSidebarTitle();

    /*
     * Reintentamos por si Material termina de actualizar
     * la navegación después de cargar el contenido.
     */
    refreshTimers = [
      window.setTimeout(updateSidebarTitle, 100),
      window.setTimeout(updateSidebarTitle, 500)
    ];
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

  /*
   * Compatibilidad con navigation.instant de Material.
   * document$ emite una actualización al cargar una nueva página.
   */
  if (
    typeof document$ !== "undefined" &&
    typeof document$.subscribe === "function"
  ) {
    document$.subscribe(function () {
      initialize();
    });
  }
})();