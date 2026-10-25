# Start Using Terraform

Bienvenido a la documentación del proyecto **Start Using Terraform**, un recorrido práctico para aprender a definir y gestionar infraestructura como código con Terraform.

## Objetivo

El proyecto explica los conceptos esenciales de Terraform y muestra cómo aplicarlos a Azure, desde la configuración inicial hasta la automatización con CI/CD. Los ejemplos combinan teoría, configuraciones HCL y procedimientos verificables.

## Contenido

La documentación se organiza en los siguientes bloques:

- **Fundamentos:** infraestructura como código, Terraform, herramientas alternativas y modelos declarativos.
- **Entorno práctico:** instalación, Azure CLI, Docker y Azure Emulator Topaz.
- **Terraform y Azure:** providers, recursos, grupos de recursos y máquinas virtuales.
- **HCL y configuración:** sintaxis, bloques principales, variables, locals y outputs.
- **Estado y operaciones:** comandos, estado remoto, bloqueo, workspaces y migraciones.
- **Servicios de Azure:** redes, máquinas virtuales, bases de datos y almacenamiento.
- **Reutilización:** módulos personalizados y buenas prácticas de organización.
- **Operación y calidad:** dependencias, metaargumentos, provisioners, validación y monitorización.
- **Seguridad:** Key Vault, valores sensibles e identidades gestionadas.
- **Automatización:** pipelines, aplicaciones controladas, aprobaciones y puertas de calidad.

## Estructura del repositorio

```
startusingterraform/
├── .github/
│   └── workflows/
│       └── pages.yml                 # GitHub Pages deployment
├── .gitignore
├── Jenkinsfile                       # Pipeline CI/CD
├── mkdocs.yml                        # Configuración MkDocs
├── requirements.txt                  # Dependencias Python
├── README.md                         # Este archivo
├── catalog-fixed.html                # Catálogo de cursos (HTML standalone)
├── azure/
│   └── tf-buenas-practicas/          # Ejemplo completo Terraform + Azure
│       ├── .gitignore
│       ├── main.tf
│       ├── outputs.tf
│       ├── providers.tf
│       ├── variables.tf
│       ├── envs/                     # Entornos (dev, prod, etc.)
│       ├── modules/                  # Módulos reutilizables
│       └── tests/                    # Pruebas
├── docs/
│   ├── index.md                      # Página principal MkDocs
│   ├── assets/                       # Recursos estáticos (CSS, JS, imágenes)
│   ├── aws/                          # Curso completo Terraform + AWS + LocalStack
│   │   ├── index.md
│   │   ├── 01-01-introduccion-a-infraestructura-como-codigo.md
│   │   ├── 01-02-terraform-aws-y-localstack.md
│   │   ├── 01-03-declarativo-frente-a-imperativo.md
│   │   ├── 01-04-instalacion-de-terraform-docker-y-aws-cli.md
│   │   ├── 01-05-arranque-de-localstack-con-docker-compose.md
│   │   ├── 01-06-configuracion-de-aws-cli-y-awslocal.md
│   │   ├── 01-07-servicios-disponibles-limitaciones-y-ediciones.md
│   │   ├── 02-01-estructura-de-un-proyecto-terraform.md
│   │   ├── 02-02-configuracion-del-provider-aws-para-localstack.md
│   │   ├── 02-03-endpoints-regiones-y-credenciales-de-prueba.md
│   │   ├── 02-04-primer-despliegue-bucket-s3.md
│   │   ├── 02-05-verificacion-de-recursos-con-aws-cli.md
│   │   ├── 02-06-limpieza-de-recursos-y-reinicio-del-laboratorio.md
│   │   ├── 03-01-sintaxis-del-lenguaje-hcl.md
│   │   ├── 03-02-bloques-principales-de-terraform.md
│   │   ├── 03-03-tipos-de-datos-y-expresiones.md
│   │   ├── 03-04-variables-y-archivos-tfvars.md
│   │   ├── 03-05-valores-locales-y-funciones.md
│   │   ├── 03-06-salidas-outputs.md
│   │   ├── 04-01-init-fmt-validate-plan-apply-y-destroy.md
│   │   ├── 04-02-planes-guardados-y-revision-de-cambios.md
│   │   ├── 04-03-dependencias-implicitas-y-explicitas.md
│   │   ├── 04-04-count-for-each-y-condicionales.md
│   │   ├── 04-05-bloques-dynamic-y-lifecycle.md
│   │   ├── 04-06-data-sources-y-referencias-a-recursos.md
│   │   ├── 05-01-s3-buckets-objetos-y-versionado.md
│   │   ├── 05-02-sqs-colas-y-dead-letter-queues.md
│   │   ├── 05-03-sns-topics-y-suscripciones.md
│   │   ├── 05-04-dynamodb-tablas-y-claves.md
│   │   ├── 05-05-integracion-sns-y-sqs.md
│   │   ├── 05-06-practica-almacenamiento-y-mensajeria.md
│   │   ├── 06-01-lambda-funciones-y-empaquetado.md
│   │   ├── 06-02-iam-roles-y-politicas-para-lambda.md
│   │   ├── 06-03-api-gateway-y-endpoints-http.md
│   │   ├── 06-04-integracion-lambda-y-dynamodb.md
│   │   ├── 06-05-integracion-sqs-y-lambda.md
│   │   ├── 06-06-logs-y-diagnostico-de-funciones.md
│   │   ├── 06-07-practica-api-serverless-local.md
│   │   ├── 07-01-fundamentos-del-estado-de-terraform.md
│   │   ├── 07-02-inspeccion-del-estado-y-comandos-state.md
│   │   ├── 07-03-importacion-de-recursos-existentes.md
│   │   ├── 07-04-refactorizacion-con-bloques-moved.md
│   │   ├── 07-05-backend-s3-en-localstack.md
│   │   ├── 07-06-bloqueo-del-estado-y-limitaciones-del-emulador.md
│   │   ├── 07-07-workspaces-y-separacion-de-entornos.md
│   │   ├── 08-01-creacion-de-modulos-personalizados.md
│   │   ├── 08-02-variables-outputs-y-contratos-de-modulos.md
│   │   ├── 08-03-modulo-de-almacenamiento-s3.md
│   │   ├── 08-04-modulo-de-mensajeria-sns-sqs.md
│   │   ├── 08-05-modulo-de-api-serverless.md
│   │   ├── 08-06-versionado-y-reutilizacion-de-modulos.md
│   │   ├── 09-01-credenciales-locales-y-prevencion-de-despliegues-en-aws.md
│   │   ├── 09-02-iam-y-principio-de-minimo-privilegio.md
│   │   ├── 09-03-secretos-y-parametros-segun-servicios-disponibles.md
│   │   ├── 09-04-valores-sensibles-y-secretos-en-el-state.md
│   │   ├── 09-05-validaciones-precondiciones-y-postcondiciones.md
│   │   ├── 09-06-analisis-estatico-y-buenas-practicas.md
│   │   ├── 10-01-estrategia-de-pruebas-de-infraestructura.md
│   │   ├── 10-02-pruebas-con-terraform-test.md
│   │   ├── 10-03-pruebas-de-integracion-con-localstack.md
│   │   ├── 10-04-localstack-en-pipelines-ci-cd.md
│   │   ├── 10-05-pipeline-de-validacion-plan-y-pruebas.md
│   │   ├── 10-06-aislamiento-y-limpieza-de-entornos-ci.md
│   │   ├── 11-01-proyecto-final-arquitectura-y-requisitos.md
│   │   ├── 11-02-proyecto-final-modulos-e-infraestructura.md
│   │   ├── 11-03-proyecto-final-api-y-procesamiento-asincrono.md
│   │   ├── 11-04-proyecto-final-pruebas-y-observabilidad.md
│   │   ├── 11-05-proyecto-final-automatizacion-ci-cd.md
│   │   └── 11-06-del-emulador-a-aws-real-diferencias-y-checklist.md
│   └── azure/                        # Curso completo Terraform + Azure + Topaz
│       ├── index.md
│       ├── 01-01-introduccion-iac.md
│       ├── 01-02-comparativa-herramientas.md
│       ├── 01-03-declarativo-imperativo.md
│       ├── 01-04-Instalacion-de-herramientas-y-arranque-de-Topaz.md
│       ├── 01-05-Entorno-Practico-Terraform-Azure-Emulator-Topaz-en-Docker.md
│       ├── 01-06-Introduccion-a-Azure-y-Terraform.md
│       ├── 01-07-configuracion-azure-cli.md
│       ├── 01-08-Desplegar-una-VM-en-el-Azure-Emulator-con-Terraform.md
│       ├── 02-01-Creacion-de-grupos-de-recursos-y-recursos-con-Terraform.md
│       ├── 02-02-Verificacion-y-validacion-de-recursos-en-Azure.md
│       ├── 03-01-Sintaxis-del-lenguaje-HCL-en-Terraform.md
│       ├── 03-02-Bloques-principales-de-Terraform.md
│       ├── 03-03-Configuracion-del-provider-azurerm.md
│       ├── 03-04-Crear-tu-primer-Resource-Group-con-Terraform.md
│       ├── 04-01-Comandos-clave-de-Terraform.md
│       ├── 04-02-Almacenamiento-y-bloqueo-del-state.md
│       ├── 05-01-variables-en-terraform.md
│       ├── 05-02-variables-basicas-en-terraform.md
│       ├── 05-03-variables-avanzadas-en-terraform.md
│       ├── 05-04-Salidas-outputs-en-Terraform.md
│       ├── 05-05-Buenas-practicas-en-Terraform-y-Azure.md
│       ├── 06-01-despliegue-de-maquinas-virtuales.md
│       ├── 06-02-redes-virtuales.md
│       ├── 06-03-bases-de-datos.md
│       ├── 06-04-almacenamiento.md
│       ├── 06-05-buenas-practicas.md
│       ├── 07-01-estado-remoto-en-azure-storage.md
│       ├── 07-02-bloqueo-de-estado.md
│       ├── 07-03-comandos-de-estado.md
│       ├── 07-04-workspaces.md
│       ├── 08-01-modulos-personalizados.md
│       ├── 08-02-ci-cd.md
│       ├── 08-03-seguridad-avanzada.md
│       ├── 08-04-optimizacion.md
│       ├── 08-05-monitorizacion-y-logging.md
│       ├── 09-01-dependencias-de-recursos.md
│       ├── 09-02-metaargumentos.md
│       ├── 09-03-provisioners.md
│       ├── 09-04-validacion.md
│       ├── 10-01-key-vault.md
│       ├── 10-02-valores-sensibles.md
│       ├── 10-03-managed-identities.md
│       ├── 11-01-automatizacion-y-ci-cd-terraform.md
│       ├── 11-02-pipeline-y-apply.md
│       └── 11-03-aprobaciones-y-puertas.md
└── site/                             # Sitio generado por MkDocs (GitHub Pages)
    ├── index.html
    ├── 404.html
    ├── sitemap.xml
    ├── sitemap.xml.gz
    ├── assets/
    │   ├── css/
    │   ├── images/
    │   ├── javascripts/
    │   ├── js/
    │   └── stylesheets/
    ├── azure/                        # Documentación Azure renderizada
    └── search/                       # Índice de búsqueda
```

## Cómo empezar

Para seguir el recorrido, entra en la sección [Terraform con Azure](docs/azure/index.md) y avanza las lecciones en orden. Para las primeras prácticas se recomienda utilizar Topaz en Docker; los capítulos indican cuándo una configuración está pensada para Azure real.

Antes de aplicar cambios, revisa siempre el plan de Terraform, protege las credenciales y comprueba la cuenta o la suscripción de Azure activa.

## Recursos adicionales

- **Curso AWS + LocalStack:** [docs/aws/index.md](docs/aws/index.md) — 60+ lecciones prácticas
- **Curso Azure + Topaz:** [docs/azure/index.md](docs/azure/index.md) — 30+ lecciones prácticas
- **Ejemplo producción:** [azure/tf-buenas-practicas/](azure/tf-buenas-practicas/) — Configuración completa con módulos, entornos y tests
- **Sitio web:** https://agile611.github.io/startusingterraform/ (desplegado via GitHub Pages)