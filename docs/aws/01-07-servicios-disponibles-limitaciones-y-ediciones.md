# Servicios disponibles, limitaciones y ediciones de LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

LocalStack permite practicar con determinadas APIs de AWS sin desplegar los recursos del ejercicio en AWS real.
Sin embargo, que un servicio aparezca en un catálogo no significa que todas sus operaciones estén implementadas.
Tampoco significa que reproduzca exactamente los permisos, tiempos, errores o garantías del servicio original.

Esta lección enseña a seleccionar servicios y comprobar su compatibilidad con tareas concretas.
Utilizaremos S3 como laboratorio principal.
SQS y DynamoDB serán ampliaciones condicionadas a la disponibilidad comprobada en el entorno del curso.

El resultado será una pequeña matriz de compatibilidad respaldada por evidencias.
La matriz distinguirá documentación consultada, operaciones ejecutadas y aspectos pendientes.
También incluirá una decisión sobre qué ejercicios pueden incorporarse al curso.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar servicio, operación y funcionalidad.
- Explicar qué significa cobertura de una API.
- Distinguir compatibilidad sintáctica y semántica.
- Reconocer diferencias entre versiones y ediciones.
- Separar emulación local y validación en AWS.

### 1.2. Objetivos prácticos

También podrás:

- Identificar la imagen utilizada.
- Preparar una matriz de compatibilidad.
- Ejecutar pruebas locales pequeñas.
- Clasificar errores sin inventar causas.
- Revisar un recurso de Terraform antes de aplicarlo.
- Decidir si una actividad está preparada para el alumnado.
- Registrar limitaciones y limpiar los recursos creados.

---

## 2. Alcance de la documentación

### 2.1. Qué incluye

Trabajaremos con:

- Identificación del entorno.
- Consulta de documentación correspondiente a la versión.
- Pruebas de operaciones concretas.
- Configuración de endpoints locales.
- Evaluación de recursos Terraform.
- Registro de resultados.
- Limpieza del laboratorio.

### 2.2. Qué no garantiza

Esta documentación no garantiza:

- Disponibilidad de todos los servicios de AWS.
- Igualdad completa entre LocalStack y AWS.
- Compatibilidad con cualquier imagen.
- Acceso a funcionalidades de cualquier edición.
- Reproducción íntegra de IAM.
- Rendimiento representativo de producción.

### 2.3. Regla principal

Una afirmación de compatibilidad debe indicar **qué operación se probó y bajo qué condiciones**.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Crear y editar archivos.
- Ejecutar comandos en Bash.
- Arrancar Docker Compose.
- Interpretar un endpoint.
- Configurar credenciales ficticias.
- Leer un plan básico de Terraform.

### 3.2. Herramientas necesarias

Prepara:

- Docker con su motor disponible.
- Docker Compose.
- AWS CLI versión 2.
- Terraform compatible con el proyecto (>= 1.6, < 2.0).
- `curl`, `jq`.
- Un editor de texto.

### 3.3. Condición del curso

El docente debe proporcionar una combinación de versiones previamente probada.
No cambies esa combinación durante una comparación sin registrarlo.

---

## 4. Vocabulario: servicio, operación y funcionalidad

La precisión del vocabulario evita conclusiones demasiado amplias.

### 4.1. Servicio

Un servicio agrupa capacidades relacionadas.
S3 es un servicio de almacenamiento de objetos.
SQS es un servicio de colas.
DynamoDB es un servicio de base de datos.

### 4.2. Operación

Una operación es una solicitud concreta de la API.
Por ejemplo, crear un bucket o consultar una cola.
La implementación de una operación no demuestra la implementación de todas las demás.

### 4.3. Funcionalidad

Una funcionalidad puede combinar varias operaciones y comportamientos.
El versionado, las notificaciones o una integración entre servicios son funcionalidades.
Pueden requerir pruebas adicionales aunque las operaciones básicas funcionen.

### 4.4. Ejemplo de alcance

Una prueba de subida y descarga de objetos no valida automáticamente:
- Versionado.
- Cifrado.
- Replicación.
- Políticas de acceso.

---

## 5. Qué significa que un servicio esté "disponible"

En LocalStack, "disponible" tiene matices importantes.

### 5.1. Niveles de disponibilidad

| Nivel | Descripción | Ejemplo |
|-------|-------------|---------|
| **Listado** | Aparece en `SERVICES` o health check | `s3: "running"` |
| **Operación básica** | CRUD principal funciona | `create-bucket`, `put-object` |
| **Funcionalidad** | Característica completa | Versionado, replicación |
| **Integración** | Funciona con otros servicios | S3 → SNS → SQS |
| **Paridad AWS** | Comportamiento idéntico | Raro en emulador |

### 5.2. Preguntas para evaluar disponibilidad

1. ¿Qué operación concreta necesito?
2. ¿Está documentada para mi versión de LocalStack?
3. ¿La he probado en mi entorno?
4. ¿Qué limitaciones conocidas tiene?
5. ¿Afecta a la validez del ejercicio?

---

## 6. Ediciones de LocalStack

LocalStack tiene diferentes ediciones con capacidades distintas.

### 6.1. Ediciones principales

| Edición | Disponibilidad | Servicios completos | Características avanzadas |
|---------|----------------|---------------------|---------------------------|
| **Community** | Gratuita, open source | ~50 servicios básicos | Limitadas |
| **Pro** | Suscripción | ~100+ servicios | Step Functions, EventBridge, Kinesis, etc. |
| **Enterprise** | Contrato | Todos + soporte | FIPS, compliance, dedicated support |

### 6.2. Implicaciones para el curso

- **Usamos Community Edition** (imagen `localstack/localstack:3.7.0`).
- Servicios Pro/Enterprise no están disponibles.
- Algunas APIs devuelven `NotImplemented` o comportamiento simplificado.
- Documenta siempre la edición usada.

### 6.3. Cómo verificar edición

```bash
# Health check incluye información de versión
curl -s http://127.0.0.1:4566/_localstack/health | jq .

# Logs al arrancar muestran edición
docker compose logs localstack | grep -i edition
```

---

## 7. Matriz de compatibilidad: Servicios del curso

### 7.1. Servicios principales (validados en Community 3.7.0)

| Servicio | Operaciones probadas | Limitaciones conocidas | Estado |
|----------|---------------------|------------------------|--------|
| **S3** | create/list/head bucket, put/get/delete object, tagging, versioning (básico) | Replicación, Object Lock, Access Points, CORS completo | ✅ Principal |
| **STS** | GetCallerIdentity, AssumeRole | Session policies, boundaries | ✅ Auxiliar |
| **SQS** | create/list/delete queue, send/receive/delete message, DLQ | FIFO completo, message timers, attributes avanzados | ✅ Módulo 05 |
| **SNS** | create/list/delete topic, subscribe/unsubscribe, publish | Filtrado avanzado, SMS, mobile push | ✅ Módulo 05 |
| **DynamoDB** | create/list/delete table, put/get/query/scan item, TTL básico | Transacciones, Streams, GSI/LSI completos, PITR | ⚠️ Parcial |
| **Lambda** | create/invoke/delete function, logs, layers | VPC, provisioned concurrency, snapshots, arm64 | ⚠️ Requiere Docker socket |
| **API Gateway** | HTTP API create/deploy, integraciones Lambda | REST API completo, custom domains, WAF, authorizers | ⚠️ Solo HTTP API |
| **IAM** | create role/policy/user, attach/detach | Conditions complejas, boundaries, SCPs, Access Analyzer | ⚠️ Simplificado |
| **CloudWatch Logs** | create log group/stream, put/get log events | Metrics, alarms, insights, cross-account | ⚠️ Básico |

### 7.2. Servicios NO disponibles en Community

| Servicio | Edición requerida | Alternativa en curso |
|----------|-------------------|---------------------|
| Step Functions | Pro | No cubierto |
| EventBridge | Pro | SNS + SQS directo |
| Kinesis | Pro | No cubierto |
| ECS/Fargate | Pro | No cubierto |
| RDS/Aurora | Pro | No cubierto |
| ElastiCache | Pro | No cubierto |
| Secrets Manager | Pro | Parameter Store (SSM) básico |

---

## 8. Pruebas de compatibilidad: Metodología

### 8.1. Plantilla de prueba por operación

```bash
# Para cada operación a validar:
# 1. Definir operación y parámetros
# 2. Ejecutar contra LocalStack
# 3. Verificar respuesta (éxito/error esperado)
# 4. Comparar con documentación AWS (si aplica)
# 5. Registrar: operación, versión, resultado, limitaciones
```

### 8.2. Ejemplo: Validar S3 versioning

```bash
# 1. Crear bucket con versioning
aws_local s3api create-bucket --bucket test-versioning-001
aws_local s3api put-bucket-versioning \
  --bucket test-versioning-001 \
  --versioning-configuration Status=Enabled

# 2. Subir objeto v1
echo "v1" > v1.txt
aws_local s3api put-object --bucket test-versioning-001 --key doc.txt --body v1.txt

# 3. Subir objeto v2 (misma key)
echo "v2" > v2.txt
aws_local s3api put-object --bucket test-versioning-001 --key doc.txt --body v2.txt

# 4. Listar versiones
aws_local s3api list-object-versions --bucket test-versioning-001

# 5. Recuperar v1
aws_local s3api get-object --bucket test-versioning-001 --key doc.txt --version-id <VersionId-v1> v1-recuperado.txt

# 6. Verificar
diff v1.txt v1-recuperado.txt

# 7. Limpiar
aws_local s3api delete-bucket --bucket test-versioning-001
```

### 8.3. Registro de resultados

| Operación | Comando | Resultado | Limitaciones | Fecha/Versión |
|-----------|---------|-----------|--------------|---------------|
| S3 versioning enable | `put-bucket-versioning` | ✅ OK | Solo Suspended/Enabled | 2024-01/3.7.0 |
| S3 list versions | `list-object-versions` | ✅ OK | DeleteMarkers incluidos | 2024-01/3.7.0 |
| S3 get specific version | `get-object --version-id` | ✅ OK | Requiere VersionId exacto | 2024-01/3.7.0 |

---

## 9. Limitaciones transversales importantes

### 9.1. IAM y permisos

- LocalStack Community **no evalúa políticas IAM complejas**.
- `Condition`, `Principal`, `NotAction` pueden ignorarse.
- `AssumeRole` funciona pero sin validar boundaries.
- **No uses LocalStack para validar políticas de producción**.

### 9.2. Nombres y unicidad

- S3 en LocalStack **no exige unicidad global** de nombres de bucket.
- En AWS real, `create-bucket` falla si el nombre existe en cualquier cuenta.
- En LocalStack, solo falla si existe en esa instancia local.

### 9.3. Cifrado y KMS

- `SSE-S3`, `SSE-KMS` pueden aceptarse pero **no cifran realmente**.
- KMS en Community: operaciones básicas (`encrypt`, `decrypt`, `generate-data-key`).
- No hay HSM, no hay rotación automática, no hay políticas de clave complejas.

### 9.4. Tiempo y latencia

- Operaciones locales: **sub-milisegundo**.
- AWS real: **milisegundos a segundos** (red, throttling, particiones).
- No extrapoles rendimiento de LocalStack a AWS.

### 9.5. Persistencia y estado

- Sin volumen: **datos perdidos al `docker compose down`**.
- Con volumen: persiste entre reinicios, pero **no es backup**.
- LocalStack no replica, no tiene multi-AZ, no tiene SLA.

---

## 10. Decisiones de inclusión en el curso

### 10.1. Criterios de inclusión

Un servicio/operación se incluye en el curso si:

1. ✅ Disponible en Community Edition.
2. ✅ Operaciones básicas probadas y funcionando.
3. ✅ Terraform provider lo soporta.
4. ✅ Permite ejercicio pedagógico completo (crear, verificar, modificar, limpiar).
5. ✅ Limitaciones documentadas y asumibles.

### 10.2. Servicios incluidos en el temario

| Módulo | Servicios | Justificación |
|--------|-----------|---------------|
| 01-02 | S3, STS | Base de todo el curso |
| 03-06 | S3 | Variables, outputs, funciones |
| 04 | S3 | Dependencias, meta-argumentos |
| 05 | S3, SQS, SNS, DynamoDB | Almacenamiento + mensajería core |
| 06 | Lambda, API Gateway, IAM, Logs | Serverless completo |
| 07 | S3 (backend), DynamoDB (locking) | Estado remoto |
| 08 | Módulos S3, SQS/SNS, API | Reutilización |
| 09 | IAM, Parameter Store | Seguridad |
| 10 | Todos anteriores | Pruebas + CI/CD |
| 11 | Todos anteriores | Proyecto final |

### 10.3. Servicios excluidos (por ahora)

| Servicio | Motivo | Posible inclusión futura |
|----------|--------|--------------------------|
| EC2/VPC | Complejidad red, no serverless | Módulo redes avanzado |
| RDS | No en Community | Si Pro disponible |
| CloudFront | No en Community | CDN module |
| Route53 | Parcial, complejo | DNS module |
| Certificate Manager | No en Community | TLS module |

---

## 11. Sesiones guiadas para el alumnado

### 11.1. Sesión 1: Matriz de compatibilidad (30 min)

1. Arrancar LocalStack con `SERVICES: s3,sts,sqs,sns,dynamodb,lambda,apigateway,iam,logs`
2. Health check completo → `jq .services`
3. Para cada servicio: ejecutar 1 operación básica (list/create)
4. Rellenar matriz: servicio, operación, resultado, limitaciones
5. **Entrega**: Matriz completada + decisión de inclusión por servicio

### 11.2. Sesión 2: Pruebas funcionales S3/SQS/SNS (30 min)

1. Probar versionado S3 (ver sección 8.2)
2. Probar DLQ en SQS (crear cola + DLQ + redrive policy)
3. Probar suscripción SNS→SQS (raw message delivery)
4. Documentar qué funciona y qué no
6. **Entrega**: Evidencias de cada prueba + limitaciones encontradas

### 11.3. Sesión 3: Decisiones de diseño (20 min)

1. Revisar matriz y pruebas
2. Decidir: ¿qué ejercicios del temario son viables?
3. ¿Qué limitaciones afectan a la pedagogía?
4. ¿Qué se debe advertir a los alumnos?
5. **Entrega**: Informe de decisiones + advertencias documentadas

---

## 12. Ejercicios de refuerzo

### 12.1. Ejercicio de identificación

Explica la diferencia entre:
- Servicio "running" en health check vs operación funcional
- Community vs Pro edition para Lambda
- Validar sintaxis vs validar semántica (IAM)

### 12.2. Ejercicio de investigación

Elige un servicio del módulo 05 o 06 (DynamoDB, Lambda, API Gateway).
Busca en la documentación de LocalStack 3.7.0:
- Qué operaciones soporta
- Qué limitaciones documenta
- Qué issues abiertos hay en GitHub
Presenta hallazgos en 5 min.

### 12.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una tabla de compatibilidad para los servicios del módulo 05 (S3, SQS, SNS, DynamoDB)
usando LocalStack Community 3.7.0.
Incluye: operación, soportada (sí/no/parcial), limitación conocida, riesgo pedagógico.
No inventes datos. Marca lo que no has verificado personalmente.
```

---

## 13. Diferencias clave: LocalStack vs AWS Real (Resumen)

| Dimensión | LocalStack Community | AWS Real |
|-----------|---------------------|----------|
| **Cobertura API** | Subconjunto (~50 servicios) | 200+ servicios |
| **IAM** | Simplificado, no estricto | Completo, evaluación estricta |
| **Nombres** | Locales únicos | Globales únicos (S3, etc.) |
| **Cifrado** | Simulado / básico | Real, HSM, certificado |
| **Escalabilidad** | Recursos host | Automática, infinita |
| **Durabilidad** | Volumen Docker (opcional) | 99.999999999% (S3) |
| **Latencia** | Sub-ms (local) | ms (red, particiones) |
| **Costes** | Hardware local | Pay-per-use |
| **SLA** | Ninguno | Contractual |
| **Actualizaciones** | Imagen Docker | Continua, gestionada |

---

## 14. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `NotImplemented` | Operación no en Community | Asumir que funciona "porque está en health check" |
| Comportamiento distinto a AWS | Limitación conocida documentada | Reportar como bug sin verificar edición |
| Datos perdidos tras reinicio | Volumen no configurado / `down -v` | Esperar persistencia sin configurarla |
| Lambda timeout | `LAMBDA_EXECUTOR`, Docker socket | Aumentar timeout sin revisar executor |
| DynamoDB query falla | Índices (GSI/LSI) no creados | Asumir paridad completa |

---

## 15. Evaluación y cierre

### 15.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Matriz | No hecha | Parcial (algunos servicios) | Completa + evidencias |
| Pruebas | Sin ejecutar | Ejecutadas sin documentar | Ejecutadas + documentadas + limitaciones |
| Decisiones | No documentadas | Parciales | Documentadas + justificadas |
| Limitaciones | No identificadas | Algunas | Completas + transversales |
| Comunicación | No advierte | Advierte genérico | Advierte específico por ejercicio |

### 15.2. Checklist final

- [ ] Health check completo revisado
- [ ] Matriz de compatibilidad rellenada con evidencias
- [ ] Pruebas funcionales ejecutadas (S3 versioning, SQS DLQ, SNS→SQS)
- [ ] Limitaciones transversales documentadas (IAM, nombres, cifrado, tiempo)
- [ ] Decisiones de inclusión/exclusión justificadas
- [ ] Advertencias para alumnado preparadas
- [ ] Limpieza de recursos de prueba
- [ ] LocalStack detenido

### 15.3. Idea principal

> **"Disponible" no significa "equivalente".**
> Cada operación debe probarse, documentarse y sus limitaciones comunicarse.
> **La matriz de compatibilidad es un documento vivo: actualízala en cada versión.**
