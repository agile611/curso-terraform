# Start Using Terraform

Bienvenido a **Start Using Terraform**, un recorrido práctico para aprender
a definir, desplegar y gestionar infraestructura como código con Terraform.

El curso ofrece dos itinerarios: **Azure** y **AWS**. Ambos combinan
explicaciones, configuraciones HCL y prácticas verificables, desde los
fundamentos hasta la automatización con CI/CD.

## Objetivo

Aprender a trabajar con Terraform de forma progresiva y segura:

- Comprender la infraestructura como código y el enfoque declarativo.
- Configurar proveedores y definir recursos.
- Utilizar variables, expresiones, valores locales y salidas.
- Revisar planes y gestionar el ciclo de vida de la infraestructura.
- Administrar el estado y separar entornos.
- Crear módulos reutilizables.
- Aplicar buenas prácticas de seguridad y validación.
- Automatizar comprobaciones, pruebas y despliegues.

## Elige tu itinerario

Cada itinerario tiene su propio entorno de prácticas y servicios.

| **Itinerario** | **Entorno práctico** | **Contenido principal** |
|---------------|---------------------|-------------------------|
| [Terraform con Azure](azure/index.md) | Topaz en Docker para las prácticas locales indicadas; Azure real cuando la lección lo requiera | Grupos de recursos, máquinas virtuales, redes, almacenamiento, Key Vault e identidades gestionadas |
| [Terraform con AWS](aws/index.md) | LocalStack en Docker para los ejemplos y prácticas locales | S3, SQS, SNS, DynamoDB, Lambda, API Gateway e IAM |

Puedes comenzar por cualquiera de los dos. Los conceptos esenciales de
Terraform son comunes, aunque cambian los proveedores, los recursos y
la configuración del laboratorio.

!!! info "AWS como plataforma, LocalStack como laboratorio"
    El itinerario de AWS enseña Terraform con el proveedor AWS.
    Sus ejemplos y prácticas se ejecutan en LocalStack, salvo indicación
    expresa. No es necesario desplegar recursos en AWS real para seguir
    las prácticas locales.

## Terraform con Azure

El itinerario de Azure avanza desde la preparación del entorno hasta
la gestión de infraestructura y los despliegues automatizados.

1. [Fundamentos y primer entorno](azure/01-01-introduccion-iac.md):
   infraestructura como código, herramientas, instalación, Topaz y Azure CLI.
2. [Recursos y verificación](azure/02-01-Creacion-de-grupos-de-recursos-y-recursos-con-Terraform.md):
   creación de recursos y comprobación de los despliegues.
3. [HCL y configuración del proveedor](azure/03-01-Sintaxis-del-lenguaje-HCL-en-Terraform.md):
   sintaxis, bloques principales, proveedor azurerm y primer grupo de recursos.
4. [Ciclo de vida y estado](azure/04-01-Comandos-clave-de-Terraform.md):
   comandos esenciales, almacenamiento del estado y bloqueo.
5. [Variables, salidas y buenas prácticas](azure/05-01-variables-en-terraform.md):
   parametrización de configuraciones y outputs.
6. [Servicios de Azure](azure/06-01-despliegue-de-maquinas-virtuales.md):
   máquinas virtuales, redes, bases de datos y almacenamiento.
7. [Estado remoto y operaciones sobre el estado](azure/07-01-estado-remoto-en-azure-storage.md):
   Azure Storage, bloqueo, comandos de estado y workspaces.
8. [Módulos, automatización y operación](azure/08-01-modulos-personalizados.md):
   reutilización, CI/CD, seguridad, optimización y monitorización.
9. [Dependencias, metaargumentos y validación](azure/09-01-dependencias-de-recursos.md):
   relaciones entre recursos, provisioners y controles de configuración.
10. [Secretos e identidad](azure/10-01-key-vault.md):
    Key Vault, valores sensibles e identidades gestionadas.
11. [CI/CD con controles](azure/11-01-automatizacion-y-ci-cd-terraform.md):
    pipelines, apply, aprobaciones y puertas de calidad.

[Acceder al itinerario de Azure](azure/index.md){ .md-button }

## Terraform con AWS

El itinerario de AWS utiliza LocalStack para practicar con servicios
emulados y construir una aplicación serverless de forma progresiva.

1. [Fundamentos y entorno local](aws/01-01-introduccion-a-infraestructura-como-codigo.md):
   infraestructura como código, Terraform, AWS, Docker y LocalStack.
2. [Primeros despliegues con Terraform](aws/02-01-estructura-de-un-proyecto-terraform.md):
   estructura del proyecto, proveedor AWS, endpoints y primer bucket S3.
3. [HCL, variables y expresiones](aws/03-01-sintaxis-del-lenguaje-hcl.md):
   tipos de datos, variables, archivos tfvars, valores locales y outputs.
4. [Flujo de trabajo y dependencias](aws/04-01-init-fmt-validate-plan-apply-y-destroy.md):
   comandos, planes guardados, dependencias y metaargumentos.
5. [Almacenamiento y mensajería](aws/05-01-s3-buckets-objetos-y-versionado.md):
   S3, SQS, SNS, DynamoDB e integración entre servicios.
6. [Aplicaciones serverless](aws/06-01-lambda-funciones-y-empaquetado.md):
   Lambda, IAM, API Gateway, procesamiento de mensajes y diagnóstico.
7. [Estado y backends](aws/07-01-fundamentos-del-estado-de-terraform.md):
   inspección, importación, refactorización, backend S3 y workspaces.
8. [Módulos y reutilización](aws/08-01-creacion-de-modulos-personalizados.md):
   contratos, módulos de almacenamiento, mensajería y API serverless.
9. [Seguridad y validación](aws/09-01-credenciales-locales-y-prevencion-de-despliegues-en-aws.md):
   credenciales de prueba, mínimo privilegio, secretos y análisis estático.
10. [Pruebas y CI/CD](aws/10-01-estrategia-de-pruebas-de-infraestructura.md):
    terraform test, pruebas de integración y laboratorios en pipelines.
11. [Proyecto final y transición a AWS](aws/11-01-proyecto-final-arquitectura-y-requisitos.md):
    arquitectura, módulos, API, procesamiento asíncrono y diferencias
    respecto a AWS real.

[Acceder al itinerario de AWS](aws/index.md){ .md-button }

## Requisitos previos

Consulta las lecciones de instalación de cada itinerario para conocer
las versiones y la configuración del entorno.

Como punto de partida, necesitarás:

- Conocimientos básicos de terminal y edición de archivos.
- Terraform.
- Docker y Docker Compose para los laboratorios locales.
- Azure CLI para el itinerario de Azure.
- AWS CLI y, cuando corresponda, awslocal para el itinerario de AWS.
- Git para trabajar con los ejemplos del repositorio.

!!! note "Compatibilidad de los emuladores"
    Los emuladores no reproducen todos los servicios ni todas las
    características de las plataformas reales. Comprueba las versiones,
    la edición utilizada y las limitaciones indicadas en cada práctica.

## Cómo empezar

1. Selecciona el itinerario de [Azure](azure/index.md) o [AWS](aws/index.md).
2. Prepara las herramientas siguiendo las primeras lecciones.
3. Arranca el entorno local correspondiente.
4. Avanza por los capítulos en orden.
5. Revisa los ejemplos y el plan antes de aplicar cambios.
6. Verifica los recursos creados y realiza la limpieza del laboratorio.

## Prácticas seguras

Antes de ejecutar Terraform, comprueba siempre el destino de tus cambios.

!!! warning "Comprueba el entorno antes de aplicar"
    Para las prácticas con LocalStack, utiliza credenciales ficticias y
    configura los endpoints locales de los servicios utilizados.
    El backend de Terraform tiene su propia configuración, independiente
    de la del proveedor.

    Si una práctica utiliza Azure o AWS real, verifica la cuenta,
    suscripción, región y permisos antes de ejecutar `terraform apply`.
    Los recursos reales pueden generar costes.

- Revisa siempre la salida de `terraform plan`.
- No publiques credenciales, secretos ni archivos de estado.
- Recuerda que marcar un valor como `sensitive` no lo elimina del estado.
- Protege el estado y controla quién puede acceder a él.
- Elimina los recursos de cada práctica cuando hayas terminado.
- No asumas que una prueba local garantiza el mismo comportamiento
  en la plataforma real.

## Repositorio y licencia

[![Licencia: CC BY-NC 4.0](https://img.shields.io/badge/Licencia-CC_BY--NC_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/deed.es)

Publicado por [Agile611](http://www.agile611.com/) bajo la licencia **Creative Commons Atribución-NoComercial 4.0 Internacional**.

README redactado por [Guillem Hernández Sola](https://www.linkedin.com/in/guillemhs/).

## Contacto

- 🌐 [agile611.com](http://www.agile611.com/)
- 📍 Carrer Laureà Miró 309, 08950 Esplugues de Llobregat (Barcelona)