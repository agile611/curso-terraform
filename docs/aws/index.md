# Curso de Terraform para AWS

Aprende a definir y gestionar infraestructura de AWS con Terraform,
utilizando LocalStack como entorno local para los ejemplos y prácticas.

## Entorno de las prácticas

- Terraform como herramienta de infraestructura como código.
- Provider AWS para definir los recursos.
- LocalStack para emular los servicios utilizados.
- Docker para ejecutar el laboratorio.
- AWS CLI o awslocal para verificar los recursos.

**Importante:** los ejercicios locales no requieren desplegar recursos en
AWS real. La compatibilidad de los servicios depende de la versión y
edición de LocalStack utilizadas.

## 01. Introducción y entorno de trabajo

- [Introduccion a infraestructura como codigo](01-01-introduccion-a-infraestructura-como-codigo.md)
- [Terraform aws y localstack](01-02-terraform-aws-y-localstack.md)
- [Declarativo frente a imperativo](01-03-declarativo-frente-a-imperativo.md)
- [Instalacion de terraform docker y aws cli](01-04-instalacion-de-terraform-docker-y-aws-cli.md)
- [Arranque de localstack con docker compose](01-05-arranque-de-localstack-con-docker-compose.md)
- [Configuracion de aws cli y awslocal](01-06-configuracion-de-aws-cli-y-awslocal.md)
- [Servicios disponibles limitaciones y ediciones](01-07-servicios-disponibles-limitaciones-y-ediciones.md)

## 02. Primeros despliegues con Terraform

- [Estructura de un proyecto terraform](02-01-estructura-de-un-proyecto-terraform.md)
- [Configuracion del provider aws para localstack](02-02-configuracion-del-provider-aws-para-localstack.md)
- [Endpoints regiones y credenciales de prueba](02-03-endpoints-regiones-y-credenciales-de-prueba.md)
- [Primer despliegue bucket s3](02-04-primer-despliegue-bucket-s3.md)
- [Verificacion de recursos con aws cli](02-05-verificacion-de-recursos-con-aws-cli.md)
- [Limpieza de recursos y reinicio del laboratorio](02-06-limpieza-de-recursos-y-reinicio-del-laboratorio.md)

## 03. HCL, variables y expresiones

- [Sintaxis del lenguaje hcl](03-01-sintaxis-del-lenguaje-hcl.md)
- [Bloques principales de terraform](03-02-bloques-principales-de-terraform.md)
- [Tipos de datos y expresiones](03-03-tipos-de-datos-y-expresiones.md)
- [Variables y archivos tfvars](03-04-variables-y-archivos-tfvars.md)
- [Valores locales y funciones](03-05-valores-locales-y-funciones.md)
- [Salidas outputs](03-06-salidas-outputs.md)

## 04. Flujo de trabajo y dependencias

- [Init fmt validate plan apply y destroy](04-01-init-fmt-validate-plan-apply-y-destroy.md)
- [Planes guardados y revision de cambios](04-02-planes-guardados-y-revision-de-cambios.md)
- [Dependencias implicitas y explicitas](04-03-dependencias-implicitas-y-explicitas.md)
- [Count for each y condicionales](04-04-count-for-each-y-condicionales.md)
- [Bloques dynamic y lifecycle](04-05-bloques-dynamic-y-lifecycle.md)
- [Data sources y referencias a recursos](04-06-data-sources-y-referencias-a-recursos.md)

## 05. Almacenamiento y mensajería

- [S3 buckets objetos y versionado](05-01-s3-buckets-objetos-y-versionado.md)
- [Sqs colas y dead letter queues](05-02-sqs-colas-y-dead-letter-queues.md)
- [Sns topics y suscripciones](05-03-sns-topics-y-suscripciones.md)
- [Dynamodb tablas y claves](05-04-dynamodb-tablas-y-claves.md)
- [Integracion sns y sqs](05-05-integracion-sns-y-sqs.md)
- [Practica almacenamiento y mensajeria](05-06-practica-almacenamiento-y-mensajeria.md)

## 06. Aplicaciones serverless

- [Lambda funciones y empaquetado](06-01-lambda-funciones-y-empaquetado.md)
- [Iam roles y politicas para lambda](06-02-iam-roles-y-politicas-para-lambda.md)
- [Api gateway y endpoints http](06-03-api-gateway-y-endpoints-http.md)
- [Integracion lambda y dynamodb](06-04-integracion-lambda-y-dynamodb.md)
- [Integracion sqs y lambda](06-05-integracion-sqs-y-lambda.md)
- [Logs y diagnostico de funciones](06-06-logs-y-diagnostico-de-funciones.md)
- [Practica api serverless local](06-07-practica-api-serverless-local.md)

## 07. Estado y backends

- [Fundamentos del estado de terraform](07-01-fundamentos-del-estado-de-terraform.md)
- [Inspeccion del estado y comandos state](07-02-inspeccion-del-estado-y-comandos-state.md)
- [Importacion de recursos existentes](07-03-importacion-de-recursos-existentes.md)
- [Refactorizacion con bloques moved](07-04-refactorizacion-con-bloques-moved.md)
- [Backend s3 en localstack](07-05-backend-s3-en-localstack.md)
- [Bloqueo del estado y limitaciones del emulador](07-06-bloqueo-del-estado-y-limitaciones-del-emulador.md)
- [Workspaces y separacion de entornos](07-07-workspaces-y-separacion-de-entornos.md)

## 08. Módulos y reutilización

- [Creacion de modulos personalizados](08-01-creacion-de-modulos-personalizados.md)
- [Variables outputs y contratos de modulos](08-02-variables-outputs-y-contratos-de-modulos.md)
- [Modulo de almacenamiento s3](08-03-modulo-de-almacenamiento-s3.md)
- [Modulo de mensajeria sns sqs](08-04-modulo-de-mensajeria-sns-sqs.md)
- [Modulo de api serverless](08-05-modulo-de-api-serverless.md)
- [Versionado y reutilizacion de modulos](08-06-versionado-y-reutilizacion-de-modulos.md)

## 09. Seguridad y validación

- [Credenciales locales y prevencion de despliegues en aws](09-01-credenciales-locales-y-prevencion-de-despliegues-en-aws.md)
- [Iam y principio de minimo privilegio](09-02-iam-y-principio-de-minimo-privilegio.md)
- [Secretos y parametros segun servicios disponibles](09-03-secretos-y-parametros-segun-servicios-disponibles.md)
- [Valores sensibles y secretos en el state](09-04-valores-sensibles-y-secretos-en-el-state.md)
- [Validaciones precondiciones y postcondiciones](09-05-validaciones-precondiciones-y-postcondiciones.md)
- [Analisis estatico y buenas practicas](09-06-analisis-estatico-y-buenas-practicas.md)

## 10. Pruebas y CI/CD

- [Estrategia de pruebas de infraestructura](10-01-estrategia-de-pruebas-de-infraestructura.md)
- [Pruebas con terraform test](10-02-pruebas-con-terraform-test.md)
- [Pruebas de integracion con localstack](10-03-pruebas-de-integracion-con-localstack.md)
- [Localstack en pipelines ci cd](10-04-localstack-en-pipelines-ci-cd.md)
- [Pipeline de validacion plan y pruebas](10-05-pipeline-de-validacion-plan-y-pruebas.md)
- [Aislamiento y limpieza de entornos ci](10-06-aislamiento-y-limpieza-de-entornos-ci.md)

## 11. Proyecto final y transición a AWS

- [Proyecto final arquitectura y requisitos](11-01-proyecto-final-arquitectura-y-requisitos.md)
- [Proyecto final modulos e infraestructura](11-02-proyecto-final-modulos-e-infraestructura.md)
- [Proyecto final api y procesamiento asincrono](11-03-proyecto-final-api-y-procesamiento-asincrono.md)
- [Proyecto final pruebas y observabilidad](11-04-proyecto-final-pruebas-y-observabilidad.md)
- [Proyecto final automatizacion ci cd](11-05-proyecto-final-automatizacion-ci-cd.md)
- [Del emulador a aws real diferencias y checklist](11-06-del-emulador-a-aws-real-diferencias-y-checklist.md)
