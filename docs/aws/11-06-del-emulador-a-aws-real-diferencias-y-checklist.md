# Del emulador a AWS real: diferencias, criterios de promoción y checklist

LocalStack permite aprender Terraform, desarrollar integraciones y ejecutar pruebas sin utilizar una cuenta AWS real.

Ese entorno resulta especialmente útil para comprobar contratos, organizar módulos y detectar errores antes de modificar infraestructura externa.

Sin embargo, una prueba correcta en el emulador no demuestra por sí sola que la misma configuración sea segura, compatible o suficiente para producción.

La transición necesita revisar identidad, permisos, redes, estado, dependencias, cuotas, costes y procedimientos operativos.

En esta lección prepararás esa revisión sin desplegar recursos en AWS real.

Las prácticas seguirán utilizando exclusivamente LocalStack.

El resultado será un expediente de preparación: configuración portable, evidencias locales, diferencias documentadas y una decisión de promoción justificable.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Los ejemplos de AWS real son referencias de diseño, no instrucciones para desplegar.
>
> No migres el estado del emulador a una cuenta real.
>
> Una decisión de promoción debe basarse en evidencias y controles independientes.

---

## 1. Objetivos de aprendizaje

Esta lección delimita qué has demostrado localmente y qué queda pendiente antes de una promoción.

### 1.1. Competencias

Al finalizar podrás:

- Distinguir emulación de equivalencia.
- Separar configuración local y configuración de destino.
- Identificar dependencias exclusivas de LocalStack.
- Revisar permisos, estado, redes y costes.
- Diseñar pruebas complementarias.
- Preparar un checklist de promoción.
- Documentar bloqueos y excepciones.
- Limpiar el laboratorio de forma verificable.

### 1.2. Resultado práctico

Entregarás un expediente de preparación sin ejecutar despliegues en AWS real.

---

## 2. Alcance de la lección

La práctica enseña a preparar una transición, no a realizarla.

### 2.1. Incluye

Análisis de diferencias.

Refactorización de un proveedor local.

Pruebas con LocalStack.

Revisión de configuración de destino.

Checklist de seguridad y operación.

### 2.2. Fuera de alcance

No se crearán cuentas, roles ni recursos en AWS real.

### 2.3. Regla

**Preparar una configuración no autoriza a ejecutarla fuera del laboratorio.**

---

## 3. Requisitos previos

Necesitas los conocimientos adquiridos durante el proyecto final.

### 3.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
git --version
```

### 3.2. Conocimientos recomendados

Revisa estado, módulos, IAM, procesamiento asíncrono, CI y limpieza.

---

## 4. Versiones y compatibilidad

Las conclusiones deben referirse a una combinación concreta de herramientas.

### 4.1. Registro obligatorio

Documenta:

- Versión de Terraform.
- Versión del proveedor AWS.
- Versión de AWS CLI.
- Imagen y edición de LocalStack.
- Runtime de las funciones.
- Dependencias de aplicación.

### 4.2. Regla

Una restricción de versiones permitidas no equivale a una matriz de versiones comprobadas.

---

## 5. Qué demuestra LocalStack

El emulador permite observar determinadas operaciones en un entorno controlado.

### 5.1. Ejemplos de propiedades comprobables

Una configuración puede crear recursos emulados.

Una aplicación puede publicar y recibir mensajes.

Un consumidor puede recuperar un documento.

Un pipeline puede detectar errores y limpiar.

### 5.2. Límite

Las conclusiones dependen de la versión, edición, configuración y escenario ejecutado.

### 5.3. Regla

Describe siempre la propiedad observada y el entorno donde se comprobó.

---

## 6. Qué no demuestra automáticamente

La equivalencia necesita pruebas adicionales en el destino autorizado.

### 6.1. Aspectos pendientes

IAM efectivo.

Condiciones de red.

Propagación y consistencia.

Cuotas y límites operativos.

Rendimiento y disponibilidad.

Facturación y costes.

### 6.2. Regla

No conviertas una prueba funcional local en una certificación de producción.

---

## 7. Matriz general de diferencias

La revisión debe separar configuración, comportamiento y operación.

### 7.1. Comparación

| **Área** | **En LocalStack** | **Pendiente en AWS real** |
|----------|-------------------|--------------------------|
| Identidad | Credenciales ficticias | Roles y cuentas autorizados |
| Red | Endpoints locales | DNS, TLS y conectividad |
| Permisos | Emulación dependiente del entorno | Evaluación efectiva |
| Estado | Laboratorio aislado | Backend y recuperación |
| Costes | Recursos AWS emulados | Presupuesto y seguimiento |

La matriz sirve como punto de partida, no como lista exhaustiva.

### 7.2. Regla

Añade diferencias específicas de cada servicio utilizado por tu proyecto.

---

## 8. Tres dimensiones de portabilidad

Una configuración puede ser portable en una dimensión y no en otra.

### 8.1. Dimensiones

Portabilidad del código Terraform.

Portabilidad del código de aplicación.

Portabilidad del procedimiento operativo.

### 8.2. Ejemplo

Un módulo SQS puede ser reutilizable mientras una función conserva un endpoint local obligatorio.

### 8.3. Regla

Revisar únicamente HCL deja dependencias importantes fuera del análisis.

---

## 9. Identidad y credenciales

Las credenciales del laboratorio deben desaparecer de la configuración de destino.

### 9.1. En LocalStack

Utilizamos valores ficticios como `test`.

Configuramos endpoints explícitos.

Evitamos perfiles y sesiones reales.

### 9.2. En un destino autorizado

La identidad debe proceder de un mecanismo aprobado de credenciales temporales.

### 9.3. Regla

No sustituyas credenciales ficticias por claves reales escritas en HCL.

---

## 10. Cuenta y región

El destino debe conocerse antes de planificar cambios reales.

### 10.1. Controles necesarios

Cuenta esperada.

Región permitida.

Rol autorizado.

Partición AWS aplicable.

Responsable de la ejecución.

### 10.2. Regla

Un nombre de workspace o una variable `environment` no verifica la cuenta activa.

### 10.3. Evidencia

La promoción debe registrar identidad efectiva y destino antes de cualquier modificación.

---

## 11. Endpoints y omisiones del proveedor

La configuración local contiene opciones que no deben convertirse en defaults productivos.

### 11.1. Revisión

Busca endpoints loopback.

Busca nombres Docker.

Revisa omisiones de validación.

Revisa acceso S3 path-style.

Revisa credenciales literales.

### 11.2. Regla

No elimines endpoints locales de una raíz de laboratorio y ejecutes inmediatamente un plan.

### 11.3. Motivo

Ese cambio podría redirigir operaciones hacia un destino no previsto.

---

## 12. Raíces separadas

La separación de raíces reduce errores de contexto.

### 12.1. Organización recomendada

```text
environments/
├── local/
│   ├── providers.tf
│   ├── backend.tf
│   └── main.tf
└── aws-reference/
    ├── README.md
    └── providers.tf.disabled

modules/
└── platform/
```

### 12.2. Regla

La referencia de destino no debe ejecutarse accidentalmente como parte del laboratorio.

---

## 13. Estado del emulador y estado real

El estado registra identidades concretas de recursos.

### 13.1. Diferencias

Un recurso emulado puede tener una identidad parecida a un recurso real.

Esa similitud no los convierte en el mismo objeto.

El endpoint forma parte del contexto operativo.

### 13.2. Regla

**No copies ni migres el estado de LocalStack para administrar recursos en AWS real.**

### 13.3. Transición correcta

El destino necesita su propio estado y un procedimiento de creación o adopción autorizado.

---

## 14. Backend remoto de destino

El backend necesita preparación independiente del proveedor de recursos.

### 14.1. Controles esperados

Almacenamiento duradero.

Cifrado.

Acceso restringido.

Versionado o recuperación equivalente.

Bloqueo compatible.

Auditoría.

### 14.2. Regla

Configurar endpoints del proveedor no configura automáticamente endpoints del backend.

---

## 15. Bloqueo y recuperación del estado

La concurrencia debe controlarse antes de compartir infraestructura.

### 15.1. Checklist

- [ ] Backend creado previamente.
- [ ] Bloqueo comprobado.
- [ ] Permisos mínimos definidos.
- [ ] Recuperación ensayada.
- [ ] Acceso de CI autorizado.
- [ ] Procedimiento de desbloqueo documentado.

### 15.2. Matiz

El bloqueo protege escrituras de estado; no sustituye coordinación ni políticas de promoción.

### 15.3. Regla

Nunca desbloquees un estado sin comprobar si existe una operación activa.

---

## 16. IAM declarado e IAM efectivo

Una política escrita correctamente todavía necesita evaluación en su contexto real.

### 16.1. Factores adicionales

Políticas de identidad.

Políticas de recursos.

Permission boundaries.

Políticas organizativas.

Políticas de sesión.

Denegaciones explícitas.

### 16.2. Regla

Una entrega SNS a SQS observada localmente no demuestra todos los rechazos IAM esperados.

---

## 17. Menor privilegio

Los permisos deben corresponder a operaciones y recursos concretos.

### 17.1. Revisión de una API

Escritura únicamente en el prefijo de solicitudes.

Envío únicamente a la cola autorizada.

Lectura necesaria para consultar estados.

Logs en sus grupos previstos.

### 17.2. Revisión del worker

Lectura de solicitudes.

Escritura de resultados.

Consumo de la cola.

### 17.3. Regla

No utilices permisos amplios como solución permanente a un error de integración.

---

## 18. ARNs y particiones

Las referencias deben obtenerse de recursos o contexto, no reconstruirse por suposiciones.

### 18.1. Riesgos habituales

Cuenta ficticia incrustada.

Región fija incorrecta.

Prefijo `arn:aws` asumido.

Nombre remoto reconstruido.

ARN copiado de una ejecución anterior.

### 18.2. Regla

Prefiere atributos calculados de Terraform y outputs de módulos.

### 18.3. Evidencia

Documenta cualquier construcción manual que no puedas evitar.

---

## 19. Red y DNS

La conectividad local no representa la topología de destino.

### 19.1. En el laboratorio

Los procesos del host utilizan loopback.

Los contenedores pueden utilizar aliases Docker.

No existe necesariamente una VPC equivalente.

### 19.2. En AWS real

Debes revisar rutas, DNS, endpoints privados y salida a servicios.

### 19.3. Regla

`localhost` dentro de un contenedor o una función identifica ese entorno, no otro servicio.

---

## 20. TLS y autenticación de transporte

HTTP local facilita el laboratorio, pero no define la seguridad del destino.

### 20.1. Revisión necesaria

HTTPS.

Certificados.

Validación de hostname.

Dominios personalizados.

Renovación.

Políticas de acceso.

### 20.2. Regla

No deshabilites validación TLS para adaptar una aplicación al destino real.

### 20.3. Límite

Una prueba con HTTP loopback no verifica certificados ni conectividad HTTPS productiva.

---

## 21. S3: configuración y garantías

El bucket del laboratorio necesita una revisión específica.

### 21.1. Controles

Bloqueo público.

Cifrado y gestión de claves.

Versionado.

Retención.

Políticas de acceso.

Lifecycle.

### 21.2. Regla

La consulta de una configuración de cifrado emulada no certifica protección física equivalente en AWS.

---

## 22. S3: borrado y versionado

La limpieza cambia cuando existen versiones y marcadores de borrado.

### 22.1. Diferencia importante

Eliminar una clave no elimina necesariamente todas sus versiones.

Un bucket puede seguir ocupado aunque el listado habitual parezca vacío.

### 22.2. Revisión

Define qué versiones pueden eliminarse y quién lo autoriza.

### 22.3. Regla

No traslades una limpieza recursiva de laboratorio a un bucket real sin revisar su política de conservación.

---

## 23. SQS: entrega y duplicados

La cola no proporciona por sí sola procesamiento exactamente una vez.

### 23.1. Revisión del consumidor

Identidad estable del trabajo.

Efectos seguros frente a duplicados.

Visibilidad suficiente.

Confirmación tras completar el procesamiento.

Tratamiento de errores parciales.

### 23.2. Regla

Una prueba con un mensaje no demuestra comportamiento bajo duplicados, carga o interrupciones.

---

## 24. SQS: DLQ y recuperación

La DLQ necesita un procedimiento operativo, no solo un recurso Terraform.

### 24.1. Preguntas obligatorias

¿Quién revisa sus mensajes?

¿Cuándo se alerta?

¿Cómo se identifica el fallo?

¿Cómo se reintenta sin duplicar efectos?

¿Qué datos se conservan?

### 24.2. Regla

Mover mensajes de vuelta sin corregir la causa puede repetir el fallo indefinidamente.

---

## 25. SNS y filtros

Las suscripciones necesitan pruebas positivas y negativas.

### 25.1. Escenarios

Evento permitido.

Evento excluido.

Atributo ausente.

Formato incorrecto.

Destino no disponible.

### 25.2. Matiz

La ausencia observada durante una ventana no prueba ausencia ilimitada.

### 25.3. Regla

Documenta el plazo de observación y la identidad del evento utilizado.

---

## 26. Lambda: runtime y dependencias

Ejecutar una función en LocalStack no valida todos los detalles de Lambda real.

### 26.1. Revisión

Runtime y fecha de soporte.

Arquitectura de CPU.

Dependencias nativas.

Tamaño del paquete.

Memoria.

Timeout.

Concurrencia.

### 26.2. Regla

Una dependencia empaquetada en el host puede no ser compatible con el runtime y la arquitectura de destino.

---

## 27. Lambda: configuración de aplicación

Los endpoints locales deben ser opcionales y explícitos.

### 27.1. Patrón de aplicación

```python
import os
import boto3

endpoint = os.environ.get("LOCAL_ENDPOINT")
arguments = {}

if endpoint:
    arguments["endpoint_url"] = endpoint

s3 = boto3.client("s3", **arguments)
```

### 27.2. Regla

Este patrón solo es seguro si la configuración de destino se revisa y la identidad se obtiene por un mecanismo autorizado.

---

## 28. API Gateway y contratos HTTP

La URL local no representa la configuración pública del destino.

### 28.1. Revisión necesaria

Autenticación.

Autorización.

Límites de uso.

CORS cuando corresponda.

Dominios.

Logs de acceso.

Respuestas de error.

### 28.2. Regla

Una API sin autenticación solo es aceptable en este laboratorio aislado, no como default de producción.

---

## 29. Logs, métricas y alarmas

La observabilidad necesita comprobar emisión, recepción y actuación.

### 29.1. Tres preguntas

¿El componente emite la señal?

¿La plataforma la conserva y permite consultarla?

¿La alerta llega a una persona o proceso responsable?

### 29.2. Regla

Crear una alarma no demuestra que se evaluará ni que alguien atenderá su notificación.

### 29.3. Privacidad

Revisa campos registrados, retención y acceso antes de utilizar datos reales.

---

## 30. Cuotas, costes y capacidad

El emulador no sustituye el análisis económico y de capacidad.

### 30.1. Controles previos

Presupuesto.

Etiquetas de coste.

Estimación de volumen.

Cuotas regionales.

Concurrencia.

Retención.

Transferencias.

### 30.2. Regla

Una alerta de presupuesto no constituye necesariamente un límite duro que impida nuevos costes.

---

## 31. Preparación del laboratorio práctico

Utilizaremos S3 y SQS para comprobar una separación portable.

### 31.1. Directorios

```bash
mkdir -p terraform-transition/modules/fixture
mkdir -p terraform-transition/environments/local
mkdir -p terraform-transition/environments/aws-reference
mkdir -p terraform-transition/scripts
mkdir -p terraform-transition/docs
mkdir -p terraform-transition/resultados
cd terraform-transition
```

### 31.2. Alcance

Solo la raíz `environments/local` será ejecutable durante la práctica.

---

## 32. Imagen y Compose del laboratorio

Selecciona una imagen validada antes de iniciar.

### 32.1. Configuración

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 32.2. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sqs
      AWS_DEFAULT_REGION: us-east-1
      SQS_ENDPOINT_STRATEGY: path
```

### 32.3. Regla

No necesitas montar el socket Docker para este fixture.

---

## 33. Protección de archivos locales

El laboratorio contiene estado y evidencias operativas.

### 33.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.env
resultados/
crash.log
```

### 33.2. Permisos

```bash
umask 077
chmod 700 resultados
```

### 33.3. Regla

Versiona la configuración, no el estado ni los planes generados.

---

## 34. Módulo portable: requisitos y entradas

Crea `modules/fixture/main.tf`.

### 34.1. Primer bloque

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
  }
}

variable "prefix" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,40}$", var.prefix))
    error_message = "Utiliza un prefijo válido para el fixture."
  }
}
```

### 34.2. Regla

El módulo no contendrá credenciales ni endpoints.

---

## 35. Módulo portable: recursos y salida

Completa `modules/fixture/main.tf`.

### 35.1. Infraestructura

```hcl
resource "aws_s3_bucket" "data" {
  bucket        = "${var.prefix}-data"
  force_destroy = false
}

resource "aws_sqs_queue" "work" {
  name = "${var.prefix}-work"
}

output "contract" {
  value = {
    version     = 1
    bucket_name = aws_s3_bucket.data.id
    queue_url   = aws_sqs_queue.work.id
  }
}
```

### 35.2. Límite

Este fixture demuestra separación del proveedor; no representa controles completos de producción.

---

## 36. Raíz local: requisitos y proveedor

Crea `environments/local/providers.tf`.

### 36.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 36.2. Regla

La configuración local permanece explícita y aislada.

---

## 37. Raíz local: composición

Crea `environments/local/main.tf`.

### 37.1. Entrada y módulo

```hcl
variable "run_id" {
  type = string
  validation {
    condition     = can(regex("^[a-f0-9]{12}$", var.run_id))
    error_message = "run_id debe tener 12 caracteres hexadecimales."
  }
}

module "fixture" {
  source = "../../modules/fixture"
  prefix = "curso-transition-${var.run_id}"
}

output "contract" {
  value = module.fixture.contract
}
```

### 37.2. Estado

La raíz utilizará el backend local predeterminado dentro de su directorio.

---

## 38. Referencia no ejecutable de destino

Crea `environments/aws-reference/providers.tf.disabled`.

### 38.1. Ejemplo de diseño

```hcl
provider "aws" {
  region = var.region

  allowed_account_ids = [
    var.expected_account_id
  ]

  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}
```

### 38.2. Restricción

El archivo carece deliberadamente de una raíz completa y tiene extensión no cargada por Terraform.

### 38.3. Regla

No lo renombres ni lo ejecutes durante esta práctica.

---

## 39. Auditoría estática de dependencias locales

Una búsqueda ayuda a localizar supuestos del laboratorio.

### 39.1. Script

Crea `scripts/audit_local_assumptions.py`:

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
tokens = (
    "localhost", "127.0.0.1", "localstack",
    "LOCAL_ENDPOINT", "skip_credentials_validation",
    "skip_requesting_account_id", "access_key", "secret_key",
)

for base in (ROOT / "modules", ROOT / "environments"):
    for path in sorted(base.rglob("*")):
        if path.is_file() and ".terraform" not in path.parts:
            text = path.read_text(encoding="utf-8", errors="replace")
            for number, line in enumerate(text.splitlines(), 1):
                hits = [token for token in tokens if token in line]
                if hits:
                    print(f"{path.relative_to(ROOT)}:{number}: {','.join(hits)}")
```

### 39.2. Regla

El script localiza coincidencias; no evalúa seguridad ni demuestra ausencia de dependencias indirectas.

---

## 40. Sesión 1: revisión de portabilidad

Duración orientativa: 30 minutos.

### 40.1. Comandos

```bash
python3 scripts/audit_local_assumptions.py
terraform fmt -recursive modules environments/local
```

### 40.2. Resultado esperado

Las dependencias locales aparecen en la raíz local.

El módulo del fixture no contiene credenciales ni endpoints.

### 40.3. Entrega

Documenta cada coincidencia como esperada, pendiente o incorrecta.

### 40.4. Regla

No elimines una coincidencia sin entender su función.

---

## 41. Sesión 2: desplegar exclusivamente en LocalStack

La aplicación debe ejecutarse sobre la raíz local.

### 41.1. Secuencia

```bash
docker compose up -d

RUN_ID="$(python3 -c 'import uuid; print(uuid.uuid4().hex[:12])')"
printf 'run_id = "%s"\n' "$RUN_ID" \
  > environments/local/terraform.tfvars

terraform -chdir=environments/local init
terraform -chdir=environments/local validate
terraform -chdir=environments/local plan \
  -out=../../resultados/create.tfplan
terraform -chdir=environments/local apply \
  ../../resultados/create.tfplan
terraform -chdir=environments/local output -json contract \
  > resultados/contract.json
```

### 41.2. Regla

Espera disponibilidad de S3 y SQS antes de aplicar.

---

## 42. Sesión 3: comprobar operaciones locales

Configura credenciales ficticias y un destino explícito.

### 42.1. Terminal y comandos

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}

BUCKET="$(jq -er '.bucket_name' resultados/contract.json)"
QUEUE_URL="$(jq -er '.queue_url' resultados/contract.json)"

aws_local s3api head-bucket --bucket "$BUCKET"
aws_local sqs get-queue-attributes \
  --queue-url "$QUEUE_URL" --attribute-names QueueArn
```

### 42.2. Conclusión permitida

Los recursos del fixture responden en el entorno local comprobado.

---

## 43. Sesión 4: escribir y recuperar un documento

La prueba utiliza una clave ficticia conocida.

### 43.1. Comandos

```bash
printf '{"purpose":"transition-laboratory","value":7}\n' \
  > resultados/document.json

aws_local s3api put-object \
  --bucket "$BUCKET" \
  --key tests/document.json \
  --body resultados/document.json

aws_local s3api get-object \
  --bucket "$BUCKET" \
  --key tests/document.json \
  resultados/recovered.json

cmp resultados/document.json resultados/recovered.json
```

### 43.2. Límite

La comparación no prueba políticas de acceso ni rendimiento en AWS real.

---

## 44. Sesión 5: revisar sin promover

El objetivo es convertir observaciones en pendientes verificables.

### 44.1. Actividad

Completa una tabla con:

Requisito.

Evidencia local.

Diferencia relevante.

Prueba pendiente.

Responsable.

### 44.2. Ejemplo

La escritura S3 funciona localmente, pero falta verificar el rol real y su acceso al prefijo autorizado.

### 44.3. Regla

No marques una prueba pendiente como completada porque su equivalente local haya pasado.

---

## 45. Checklist de configuración portable

La configuración debe separar mecanismos locales y decisiones funcionales.

### 45.1. Revisión

- [ ] Módulos sin credenciales.
- [ ] Módulos sin endpoints locales.
- [ ] Proveedores definidos en la raíz.
- [ ] Aplicación sin endpoint local obligatorio.
- [ ] Nombres y referencias calculados.
- [ ] Dependencias fijadas.
- [ ] Defaults revisados.
- [ ] Configuración de destino separada.

### 45.2. Regla

El checklist debe acompañarse de archivos y revisiones concretas.

---

## 46. Checklist de identidad y seguridad

La seguridad del destino requiere aprobación independiente.

### 46.1. Revisión

- [ ] Cuenta y región autorizadas.
- [ ] Rol de despliegue definido.
- [ ] Credenciales temporales.
- [ ] Permisos de aplicación separados.
- [ ] Menor privilegio revisado.
- [ ] Acceso público justificado.
- [ ] Cifrado definido.
- [ ] Gestión de secretos aprobada.

### 46.2. Regla

No almacenes secretos en `terraform.tfvars` ni en artifacts.

---

## 47. Checklist de estado y CI

El flujo debe proteger decisiones y registros operativos.

### 47.1. Revisión

- [ ] Backend preparado.
- [ ] Estado independiente del emulador.
- [ ] Bloqueo comprobado.
- [ ] Plan protegido.
- [ ] Aplicación del plan revisado.
- [ ] Identidad del runner verificada.
- [ ] Artifacts seleccionados.
- [ ] Recuperación documentada.

### 47.2. Regla

Un archivo de plan puede contener valores sensibles aunque su presentación visual los oculte.

---

## 48. Checklist de operación y costes

La infraestructura necesita responsables después del despliegue.

### 48.1. Revisión

- [ ] Propietario técnico identificado.
- [ ] Presupuesto revisado.
- [ ] Cuotas comprobadas.
- [ ] Alarmas con destinatarios.
- [ ] Retención definida.
- [ ] Backup y recuperación ensayados.
- [ ] Procedimiento de incidentes.
- [ ] Limpieza autorizada.

### 48.2. Regla

La operación no termina cuando `terraform apply` devuelve código cero.

---

## 49. Decisión de promoción

La decisión debe tener estados explícitos y evidencia trazable.

### 49.1. Estados

`blocked`: faltan controles obligatorios.

`ready_for_authorized_validation`: preparado para pruebas en un destino aprobado.

`approved_for_specific_change`: cambio concreto autorizado.

### 49.2. Límite

El laboratorio solo permite justificar los dos primeros estados.

### 49.3. Regla

Una aprobación pertenece a un cambio y contexto concretos, no a cualquier versión futura del proyecto.

---

## 50. Excepciones y deuda pendiente

Las excepciones deben ser visibles, limitadas y asignadas.

### 50.1. Registro mínimo

Control no cumplido.

Motivo.

Riesgo.

Medida compensatoria.

Responsable.

Fecha de revisión.

### 50.2. Regla

Una excepción no debe convertirse silenciosamente en un default permanente.

### 50.3. Evaluación

Un bloqueo bien documentado es preferible a una promoción injustificada.

---

## 51. Plan de validación autorizado

Las pruebas de destino deben diseñarse antes de ejecutarse.

### 51.1. Orden recomendado

Verificar identidad y región.

Comprobar límites y presupuesto.

Preparar backend.

Revisar permisos.

Planificar recursos mínimos.

Probar recorrido y fallos.

Verificar recuperación y limpieza.

### 51.2. Regla

Esta página define el procedimiento conceptual; no proporciona una ejecución real de esas etapas.

---

## 52. Rollback y cambios de infraestructura

Volver al código anterior no garantiza recuperar el estado anterior del sistema.

### 52.1. Riesgos

Recursos reemplazados.

Datos eliminados.

Migraciones incompatibles.

Mensajes pendientes.

Cambios externos.

### 52.2. Regla

Define recuperación de datos y compatibilidad de aplicación, no solo reversión de un commit.

### 52.3. Terraform

Revisa el plan de recuperación antes de ejecutar modificaciones.

---

## 53. Limpieza del laboratorio

Los datos de prueba deben retirarse antes de destruir el bucket.

### 53.1. Secuencia

```bash
aws_local s3api delete-object \
  --bucket "$BUCKET" \
  --key tests/document.json

terraform -chdir=environments/local plan -destroy \
  -out=../../resultados/destroy.tfplan
terraform -chdir=environments/local show \
  ../../resultados/destroy.tfplan
terraform -chdir=environments/local apply \
  ../../resultados/destroy.tfplan
terraform -chdir=environments/local state list
```

### 53.2. Regla

Si destroy falla, conserva el estado y el emulador para investigar.

---

## 54. Verificación de ausencia

La ausencia debe comprobarse mientras el endpoint sigue disponible.

### 54.1. Comandos

```bash
aws_local s3api list-buckets
aws_local sqs list-queues
docker compose ps
```

### 54.2. Revisión

Busca el bucket y la cola del identificador utilizado.

Comprueba que Terraform no administra recursos pendientes.

Después ejecuta `docker compose down`.

### 54.3. Regla

Una conexión fallida no demuestra que los recursos hayan desaparecido.

---

## 55. Entrega, ejercicios y resumen

La entrega final debe explicar qué es portable, qué se comprobó y qué sigue bloqueado.

### 55.1. Documentación mínima

Matriz de diferencias.

Registro de versiones.

Checklist con evidencias.

Referencia de destino no ejecutable.

Plan de validación autorizado.

Procedimiento de recuperación.

### 55.2. Ejercicios

1. Detecta un endpoint local obligatorio en la aplicación.
2. Revisa permisos S3 del worker.
3. Diseña pruebas negativas IAM.
4. Documenta limpieza con versionado S3.
5. Identifica una cuota relevante.
6. Explica por qué no debe migrarse el estado local.
7. Registra una decisión de promoción bloqueada.
8. Verifica la limpieza completa del fixture.

### 55.3. Idea final

**Pasar del emulador a AWS real no consiste en cambiar una URL: exige separar identidades, revisar garantías y autorizar un cambio concreto con evidencias suficientes.**