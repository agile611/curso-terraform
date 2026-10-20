# Valores sensibles y secretos en el state de Terraform

Terraform necesita conservar información suficiente para relacionar la configuración con los recursos que administra.

Ese registro puede incluir contraseñas, tokens, cadenas de conexión y otros valores sensibles.

Marcar una variable como `sensitive` reduce su exposición en determinadas salidas, pero no elimina automáticamente su contenido del estado.

También pueden existir copias en planes guardados, archivos de respaldo, resultados JSON y versiones anteriores de un backend remoto.

En esta lección comprobarás esas propiedades utilizando valores exclusivamente ficticios.

Crearás un parámetro `SecureString` en LocalStack y un recurso didáctico que permite observar el comportamiento de Terraform sin depender únicamente del proveedor AWS.

Después inspeccionarás los artefactos sin imprimir el valor, actualizarás el dato y revisarás qué copias permanecen.

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> No introduzcas contraseñas, tokens ni claves reales en este laboratorio.
>
> Las evidencias de evaluación no deben contener el valor ficticio completo.

---

## 1. Objetivos de aprendizaje

Esta lección convierte la protección del estado en una práctica observable y reproducible.

### 1.1. Qué aprenderás

Al finalizar podrás:

- Diferenciar ocultación, cifrado y ausencia de persistencia.
- Identificar valores sensibles dentro del estado.
- Explicar qué conserva un plan guardado.
- Inspeccionar artefactos sin imprimir secretos.
- Reconocer copias históricas después de una actualización.
- Diseñar alternativas que eviten introducir contenido en Terraform.
- Documentar limpieza, retención y respuesta a una exposición.

### 1.2. Resultado práctico

Construirás un inventario de artefactos y comprobarás cuáles contienen cada generación de un valor ficticio.

---

## 2. Requisitos previos

Necesitas las herramientas del curso y conocimientos de variables, outputs y estado.

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
git --version
```

### 2.2. Versiones de referencia

Utilizaremos Terraform 1.6 o superior dentro de la serie 1.x.

El proveedor AWS se limita a la serie 5.x.

---

## 3. Compatibilidad del laboratorio

El docente debe validar el recorrido completo antes de distribuir la práctica.

### 3.1. Operaciones obligatorias

Comprueba:

- Ejecución del recurso integrado `terraform_data`.
- Creación de parámetros SSM `SecureString`.
- Lectura y actualización del parámetro.
- Generación de planes guardados.
- Exportación de estado y plan a JSON.
- Creación de respaldos del estado local.
- Destrucción y consulta final de recursos.

### 3.2. Registro

Documenta Terraform, proveedor, AWS CLI, Python e imagen o digest de LocalStack.

---

## 4. Qué es el estado

El estado relaciona direcciones Terraform con objetos administrados y sus atributos.

### 4.1. Información habitual

Puede conservar:

- Identificadores remotos.
- Atributos de recursos.
- Outputs raíz.
- Información de dependencias.
- Metadatos del proveedor.
- Valores obtenidos o enviados durante la gestión.

### 4.2. Regla principal

**El estado es material operativo de alto valor, no un archivo auxiliar prescindible.**

---

## 5. Por qué pueden aparecer secretos

Terraform necesita representar los valores que administra según el esquema del recurso.

### 5.1. Ejemplos

Pueden entrar en el estado:

- Valores de parámetros.
- Versiones de secretos.
- Contraseñas de ciertos recursos.
- Claves generadas.
- Resultados de data sources.
- Outputs que incluyen contenido sensible.

### 5.2. Precaución

El comportamiento exacto depende del recurso, proveedor y versión utilizados.

---

## 6. Tres propiedades diferentes

Ocultar un dato no equivale a cifrarlo ni a evitar su almacenamiento.

### 6.1. Comparación

| **Propiedad** | **Qué significa** | **Ejemplo** |
|---------------|-------------------|-------------|
| Ocultación | No mostrar en una salida concreta | Variable sensible |
| Cifrado | Almacenar una representación protegida | Backend con cifrado |
| No persistencia | No conservar el valor en el artefacto | Flujo compatible con valores efímeros |

Estas propiedades pueden combinarse, pero ninguna implica automáticamente las otras.

### 6.2. Regla

Pregunta siempre qué artefacto está protegido y frente a qué acceso.

---

## 7. Qué hace `sensitive`

Una marca sensible influye en el tratamiento de valores y su presentación.

### 7.1. Efecto visible

Terraform puede sustituir el valor por una indicación como:

```text
(sensitive value)
```

### 7.2. Propagación

La sensibilidad puede propagarse a expresiones que dependen del valor.

### 7.3. Regla

Esta marca no constituye un mecanismo de cifrado del estado.

---

## 8. Qué no hace `sensitive`

La marca no elimina todas las vías de exposición.

### 8.1. No garantiza

- Ausencia del valor en estado.
- Ausencia del valor en planes.
- Protección de backups.
- Eliminación de logs anteriores.
- Cifrado de archivos locales.
- Ausencia de exposición mediante comandos explícitos.

### 8.2. Regla

No aceptes una captura con valores ocultos como única evidencia de protección.

---

## 9. Outputs sensibles

Un output sensible sigue siendo un dato disponible para operaciones autorizadas.

### 9.1. Comportamiento relevante

El listado general de outputs puede ocultar su contenido.

Consultar un output específico puede revelar el valor.

Los formatos `-raw` y `-json` pueden mostrar valores sensibles.

### 9.2. Laboratorio

Capturaremos estas salidas en archivos protegidos, no en la consola.

### 9.3. Regla

Un output sensible no es un canal seguro de distribución por sí solo.

---

## 10. Planes guardados

Un plan guardado contiene información necesaria para aplicar una decisión preparada.

### 10.1. Consecuencia

Puede incorporar el valor sensible aunque la representación humana lo oculte.

### 10.2. Formato

El archivo `.tfplan` no debe tratarse como texto plano ni como un archivo cifrado.

### 10.3. Inspección

Utilizaremos `terraform show -json` para obtener una representación estructurada.

### 10.4. Regla

Protege el plan original y su exportación JSON.

---

## 11. Copias y derivados

Un mismo dato puede existir en varios lugares al mismo tiempo.

### 11.1. Inventario inicial

Revisaremos:

- Estado actual.
- Respaldo del estado local.
- Plan de creación.
- Plan de actualización.
- Exportaciones JSON.
- Outputs capturados.
- Copias previas a la destrucción.

### 11.2. Regla

La exposición no termina cuando el estado actual deja de contener una generación antigua.

---

## 12. Modelo de amenazas educativo

El laboratorio estudia exposición accidental de artefactos y no resistencia frente a código malicioso.

### 12.1. Riesgos analizados

Consideraremos publicación en Git, archivos compartidos y resultados de CI.

También analizaremos lectura local por usuarios con acceso al proyecto.

### 12.2. Fuera de alcance

No verificaremos resistencia frente a administradores del host, malware o análisis forense completo.

### 12.3. Regla

Declara el alcance antes de utilizar palabras como “seguro” o “eliminado”.

---

## 13. Arquitectura del laboratorio

Utilizaremos dos destinos para el mismo valor ficticio.

### 13.1. Recorrido

```text
Generador de valor ficticio
    │
    ▼
Terraform
    ├── terraform_data
    ├── Parámetro SSM SecureString en LocalStack
    └── Output sensible
             │
             ▼
      Estado, planes y exportaciones
             │
             ▼
      Escáner sin impresión del valor
```

### 13.2. Propósito

La duplicación es didáctica, no una recomendación de arquitectura.

---

## 14. Recurso de control

El recurso `terraform_data` permite observar persistencia sin crear infraestructura AWS.

### 14.1. Ventaja

Está integrado en Terraform y no requiere un proveedor remoto adicional.

### 14.2. Uso

Guardaremos el valor ficticio dentro de su entrada.

### 14.3. Precaución

No utilices este recurso como almacén de secretos.

### 14.4. Regla

Su presencia permite separar comportamiento de Terraform y comportamiento del servicio emulado.

---

## 15. Parámetro SSM

El parámetro mostrará un caso realista de contenido administrado por el proveedor AWS.

### 15.1. Tipo elegido

Utilizaremos:

```text
SecureString
```

### 15.2. AWS real

Este tipo participa en un flujo de cifrado mediante KMS según la configuración.

### 15.3. Regla

El cifrado del servicio no implica ausencia del valor original en el estado Terraform.

---

## 16. Modo opcional sin SSM

La práctica admite una reducción de alcance si SSM no está disponible.

### 16.1. Configuración

Una variable permitirá desactivar únicamente el recurso SSM.

### 16.2. Qué permanece

El recurso `terraform_data`, el output y las pruebas de artefactos.

### 16.3. Límite

Ese modo no demuestra persistencia específica de `aws_ssm_parameter`.

### 16.4. Regla

No sustituyas `SecureString` por `String` como fallback silencioso.

---

## 17. Preparación del directorio

Trabaja en una carpeta independiente.

### 17.1. Estructura

```bash
mkdir -p terraform-sensitive-state/app
mkdir -p terraform-sensitive-state/scripts
mkdir -p terraform-sensitive-state/planes
mkdir -p terraform-sensitive-state/resultados
mkdir -p terraform-sensitive-state/copias
cd terraform-sensitive-state
```

### 17.2. Ejecución

Los comandos se ejecutan desde esta raíz.

### 17.3. Aislamiento

No copies estados ni directorios `.terraform` de otros proyectos.

---

## 18. Protección de archivos

Separa configuración versionable y material operativo.

### 18.1. `.gitignore`

```gitignore
**/.terraform/
**/*.tfstate
**/*.tfstate.*
**/*.tfplan
**/__pycache__/
.sandbox/
.env
planes/
resultados/
copias/
crash.log
```

### 18.2. Qué conservar

Versiona configuración, scripts y `.terraform.lock.hcl`.

---

## 19. Permisos locales

Reduce la exposición accidental de archivos creados durante la práctica.

### 19.1. Preparación

```bash
umask 077
chmod 700 planes resultados copias
```

### 19.2. Alcance

Estos permisos ayudan en sistemas con semántica POSIX.

### 19.3. Otros sistemas

En Windows, configura ACL equivalentes según el procedimiento del docente.

### 19.4. Regla

Los permisos del archivo no protegen frente a todos los administradores del host.

---

## 20. Imagen validada

Utiliza una imagen reproducible de LocalStack.

### 20.1. Selección

```bash
export LOCALSTACK_IMAGE='SUSTITUIR_POR_IMAGEN_VALIDADA'
printf 'LOCALSTACK_IMAGE=%s\n' "$LOCALSTACK_IMAGE" > .env
```

### 20.2. Recomendación

Utiliza una etiqueta fija o un digest.

### 20.3. Edición

Comprueba las operaciones SSM utilizadas en la edición seleccionada.

### 20.4. Regla

No presupongas soporte completo por disponer de un endpoint accesible.

---

## 21. Docker Compose

Publica el servicio únicamente en la interfaz local.

### 21.1. `compose.yaml`

```yaml
services:
  localstack:
    image: ${LOCALSTACK_IMAGE:?Define LOCALSTACK_IMAGE}
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: ssm
      AWS_DEFAULT_REGION: us-east-1
```

### 21.2. Arranque

Ejecuta `docker compose up -d`.

### 21.3. Alcance

No necesitas montar el socket Docker para esta práctica SSM.

---

## 22. Contexto AWS local

Prepara la terminal para operaciones de verificación.

### 22.1. Configuración

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""

unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE
unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_SSM TF_WORKSPACE

aws_local() {
  aws --endpoint-url=http://127.0.0.1:4566 --region us-east-1 "$@"
}
```

### 22.2. Regla

Todas las solicitudes AWS de esta página deben utilizar el endpoint local.

---

## 23. Requisitos de Terraform

Crea `app/versions.tf`.

### 23.1. Configuración

```hcl
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### 23.2. Decisión

Utilizaremos estado local para inspeccionar artefactos directamente.

---

## 24. Proveedor exclusivamente local

Crea `app/providers.tf`.

### 24.1. Configuración

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    ssm = "http://127.0.0.1:4566"
  }
}
```

### 24.2. Precaución

Estas opciones no sustituyen la configuración explícita de endpoints.

---

## 25. Variables del laboratorio

Crea `app/variables.tf`.

### 25.1. Identidad y modo

```hcl
variable "suffix" {
  type = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.suffix))
    error_message = "Usa entre 4 y 8 caracteres alfanuméricos."
  }
}

variable "use_ssm" {
  type    = bool
  default = true
}

variable "demo_secret" {
  type      = string
  sensitive = true
  nullable  = false
}
```

---

## 26. Recursos administrados

Crea `app/main.tf`.

### 26.1. Configuración

```hcl
resource "terraform_data" "example" {
  input = {
    purpose = "fictitious-state-demonstration"
    value   = var.demo_secret
  }
}

resource "aws_ssm_parameter" "example" {
  count = var.use_ssm ? 1 : 0

  name  = "/curso/${var.suffix}/state-demo/api-key"
  type  = "SecureString"
  value = var.demo_secret

  tags = {
    Laboratory = "LocalStack"
  }
}
```

---

## 27. Outputs de demostración

Crea `app/outputs.tf`.

### 27.1. Configuración

```hcl
output "demo_secret" {
  value     = var.demo_secret
  sensitive = true
}

output "parameter_name" {
  value = try(aws_ssm_parameter.example[0].name, null)
}
```

### 27.2. Advertencia

El output secreto existe únicamente para demostrar exposición controlada.

### 27.3. Producción

Prefiere publicar referencias cuando la aplicación pueda recuperar el contenido directamente.

---

## 28. Entradas no sensibles

Crea `app/terraform.tfvars`.

### 28.1. Configuración

```hcl
suffix  = "alumno01"
use_ssm = true
```

### 28.2. Adaptación

Selecciona `use_ssm = false` solo si el docente ha definido el modo reducido.

### 28.3. Regla

No incluyas `demo_secret` en este archivo.

### 28.4. Entorno compartido

Cada alumno debe utilizar un sufijo distinto.

---

## 29. Valores ficticios identificables

Generaremos valores con un marcador exclusivo del laboratorio.

### 29.1. Formato

```text
LAB_STATE_DEMO_...
```

### 29.2. Propósito

El escáner podrá identificar cada generación sin imprimir su contenido.

### 29.3. Precaución

El marcador no es una medida criptográfica de protección.

### 29.4. Regla

Nunca sustituyas el generador por credenciales reales.

---

## 30. Generador de generaciones

Crea `scripts/new-fixture.py`.

### 30.1. Implementación

```python
import json
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
directory = root / ".sandbox"
directory.mkdir(mode=0o700, parents=True, exist_ok=True)
path = directory / "fixtures.json"

fixtures = json.loads(path.read_text()) if path.exists() else []
fixtures.append({
    "generation": len(fixtures) + 1,
    "value": "LAB_STATE_DEMO_" + secrets.token_hex(24),
})

path.write_text(json.dumps(fixtures), encoding="utf-8")
path.chmod(0o600)

print(json.dumps({
    "generation_created": fixtures[-1]["generation"],
    "value_printed": False,
}))
```

---

## 31. Por qué existe un fixture local

El fixture facilita pruebas repetibles sin memorizar ni imprimir valores.

### 31.1. Decisión didáctica

Conservaremos todas las generaciones en un archivo protegido.

### 31.2. Consecuencia

Ese archivo es otra copia del material utilizado.

### 31.3. Regla

No confundas la facilidad del laboratorio con una recomendación de almacenar secretos de producción en JSON local.

### 31.4. Evaluación

El fixture no forma parte de los archivos que entrega el alumno.

---

## 32. Ejecutor Terraform

Un script pasará la última generación al proceso hijo mediante una variable de entorno.

### 32.1. Objetivos

Evitar valores en argumentos del shell.

Evitar editar archivos `.tfvars` sensibles.

Mantener un endpoint local en la configuración revisada.

### 32.2. Límite

El valor sigue disponible en memoria y en el entorno del proceso hijo.

### 32.3. Regla

El script no es una sandbox ni un almacén seguro.

---

## 33. Script de ejecución

Crea `scripts/tf-lab.py`.

### 33.1. Implementación

```python
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
arguments = sys.argv[1:]
allowed = {"init", "fmt", "validate", "plan", "apply", "show", "output", "state"}

if not arguments or arguments[0] not in allowed:
    raise SystemExit("Comando Terraform no previsto.")

binary = shutil.which("terraform")
if binary is None:
    raise SystemExit("No se encuentra Terraform.")

environment = os.environ.copy()
for key in list(environment):
    if key.startswith(("AWS_", "TF_VAR_", "TF_CLI_ARGS")):
        environment.pop(key, None)
environment.pop("TF_WORKSPACE", None)

environment.update({
    "AWS_ACCESS_KEY_ID": "test",
    "AWS_SECRET_ACCESS_KEY": "test",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_EC2_METADATA_DISABLED": "true",
})

if arguments[0] in {"plan", "apply"}:
    fixtures = json.loads((root / ".sandbox" / "fixtures.json").read_text())
    environment["TF_VAR_demo_secret"] = fixtures[-1]["value"]

command = [binary, f"-chdir={root / 'app'}", *arguments]
raise SystemExit(subprocess.call(command, env=environment))
```

---

## 34. Límites del ejecutor

El procedimiento depende de código y herramientas confiables.

### 34.1. No controla

- Configuraciones HCL modificadas.
- Proveedores arbitrarios.
- Todos los argumentos posibles.
- La integridad del binario.
- El tráfico de red completo.
- Los permisos del sistema operativo.

### 34.2. Regla

Utiliza el aislamiento de la lección de credenciales cuando necesites controles adicionales.

---

## 35. Escáner sin impresión de valores

El escáner comparará artefactos contra generaciones conocidas.

### 35.1. Salida prevista

Mostrará únicamente:

- Ruta del artefacto.
- Generación.
- Presencia del valor.
- Número de campos coincidentes.
- Existencia del archivo.

### 35.2. Regla

No mostrará el contenido de las coincidencias ni fragmentos del secreto.

---

## 36. Escáner: recorrido estructurado

Crea `scripts/scan-artifacts.py`.

### 36.1. Código inicial

```python
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
fixtures = json.loads((root / ".sandbox" / "fixtures.json").read_text())

def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            yield key
            yield from strings(item)

if len(sys.argv) < 2:
    raise SystemExit("Indica uno o varios archivos para inspeccionar.")
```

---

## 37. Escáner: lectura y resultados

Completa el mismo archivo.

### 37.1. Implementación

```python
for argument in sys.argv[1:]:
    path = root / argument

    if not path.exists():
        print(json.dumps({
            "artifact": argument,
            "exists": False,
        }))
        continue

    text = path.read_text(encoding="utf-8")
    try:
        fields = list(strings(json.loads(text)))
        format_name = "json"
    except json.JSONDecodeError:
        fields = [text]
        format_name = "text"

    for fixture in fixtures:
        matches = sum(fixture["value"] in field for field in fields)
        print(json.dumps({
            "artifact": argument,
            "exists": True,
            "format": format_name,
            "generation": fixture["generation"],
            "present": matches > 0,
            "matching_fields": matches,
        }))
```

---

## 38. Límites del escáner

El escáner está diseñado para valores ficticios conocidos.

### 38.1. No demuestra

Ausencia de otros secretos.

Ausencia de representaciones transformadas.

Ausencia de contenido en archivos binarios.

Ausencia de copias externas.

### 38.2. Conteos

Los campos coincidentes no equivalen al número de copias independientes.

### 38.3. Regla

No lo utilices como certificación general de que un proyecto está libre de secretos.

---

## 39. Sesión 1: preparar y validar

Duración orientativa: 20 minutos.

### 39.1. Secuencia

```bash
python3 -m py_compile scripts/new-fixture.py
python3 -m py_compile scripts/tf-lab.py
python3 -m py_compile scripts/scan-artifacts.py

python3 scripts/new-fixture.py
python3 scripts/tf-lab.py init
python3 scripts/tf-lab.py fmt
python3 scripts/tf-lab.py validate
```

### 39.2. Resultado esperado

Se crea la generación 1 sin imprimir su valor.

---

## 40. Sesión 2: revisar ocultación

La representación humana permitirá observar el efecto de sensibilidad.

### 40.1. Comandos

```bash
python3 scripts/tf-lab.py plan -out=../planes/create.tfplan
python3 scripts/tf-lab.py show ../planes/create.tfplan \
  > resultados/create-human.txt
```

### 40.2. Expectativa

El plan crea dos recursos con SSM activado.

### 40.3. Revisión

Comprueba las indicaciones de sensibilidad y las acciones previstas.

### 40.4. Regla

No deduzcas ausencia del secreto dentro del plan binario.

---

## 41. Sesión 3: exportar el plan

La representación JSON permite inspeccionar el contenido estructurado.

### 41.1. Comandos

```bash
python3 scripts/tf-lab.py show -json ../planes/create.tfplan \
  > resultados/create-plan.json

python3 scripts/scan-artifacts.py \
  resultados/create-human.txt \
  resultados/create-plan.json \
  > resultados/scan-create-plan.jsonl
```

### 41.2. Resultado esperado

La generación 1 aparece en la representación JSON.

### 41.3. Regla

La redirección evita imprimirla, pero crea otra copia sensible.

---

## 42. Interpretar plan humano y JSON

Ambas representaciones proceden de la misma decisión preparada.

### 42.1. Diferencia

La versión humana prioriza revisión y ocultación.

La versión JSON permite a herramientas acceder a valores y metadatos.

### 42.2. Sensibilidad

El JSON puede incluir marcas que identifican atributos sensibles sin retirar necesariamente sus valores.

### 42.3. Regla

Una herramienta que procesa JSON debe aplicar su propia política de exposición.

---

## 43. Sesión 4: aplicar y exportar estado

Ahora comprobarás persistencia después de crear los recursos.

### 43.1. Comandos

```bash
python3 scripts/tf-lab.py apply ../planes/create.tfplan
python3 scripts/tf-lab.py state list

python3 scripts/tf-lab.py state pull \
  > resultados/state-generation-1.json

python3 scripts/scan-artifacts.py \
  app/terraform.tfstate \
  resultados/state-generation-1.json
```

### 43.2. Resultado esperado

La generación 1 aparece en ambos artefactos.

---

## 44. Estado bruto y representación JSON

No todos los formatos JSON de Terraform tienen la misma estructura.

### 44.1. `state pull`

Devuelve una representación del estado administrado.

### 44.2. `show -json`

Produce una representación orientada al consumo por herramientas.

### 44.3. Precaución

No asumas que ambos documentos tienen los mismos campos o pueden intercambiarse.

### 44.4. Regla

Utiliza cada formato para su propósito y no reconstruyas estado manualmente desde una exportación de presentación.

---

## 45. Sesión 5: outputs y exposición explícita

La prueba capturará el output sensible sin mostrarlo.

### 45.1. Comandos

```bash
python3 scripts/tf-lab.py output \
  > resultados/outputs-human.txt

python3 scripts/tf-lab.py output -json \
  > resultados/outputs-all.json

python3 scripts/tf-lab.py output -raw demo_secret \
  > resultados/output-secret.txt
```

### 45.2. Escaneo

Inspecciona los tres archivos con `scan-artifacts.py`.

### 45.3. Resultado esperado

JSON y consulta explícita contienen la generación 1.

---

## 46. Sesión 6: parámetro en LocalStack

Comprueba el recurso sin recuperar innecesariamente el contenido.

### 46.1. Metadatos

```bash
aws_local ssm describe-parameters \
  --parameter-filters \
  "Key=Name,Option=Equals,Values=/curso/alumno01/state-demo/api-key" \
  > resultados/parameter-metadata.json
```

### 46.2. Revisión

Confirma nombre y tipo `SecureString`.

### 46.3. Regla

Esta consulta no demuestra cifrado del archivo de estado ni garantías criptográficas del host.

---

## 47. Sesión 7: actualizar generación

Una nueva generación permitirá observar copias históricas.

### 47.1. Secuencia

```bash
python3 scripts/new-fixture.py

python3 scripts/tf-lab.py plan -out=../planes/update.tfplan
python3 scripts/tf-lab.py show ../planes/update.tfplan \
  > resultados/update-human.txt

python3 scripts/tf-lab.py show -json ../planes/update.tfplan \
  > resultados/update-plan.json
```

### 47.2. Expectativa

El plan representa el cambio de generación 1 a generación 2.

---

## 48. Valores anteriores en un plan

Un plan de actualización puede contener información previa y propuesta.

### 48.1. Consecuencia

La generación antigua puede aparecer junto a la nueva.

### 48.2. Comprobación

```bash
python3 scripts/scan-artifacts.py \
  resultados/update-plan.json
```

### 48.3. Regla

No limites la inspección a `after`; otros campos pueden contener datos sensibles.

### 48.4. Evaluación

Registra las generaciones observadas sin imprimir sus valores.

---

## 49. Sesión 8: aplicar y revisar backup

La aplicación actualiza el estado y puede conservar su versión anterior.

### 49.1. Comandos

```bash
python3 scripts/tf-lab.py apply ../planes/update.tfplan

python3 scripts/scan-artifacts.py \
  app/terraform.tfstate \
  app/terraform.tfstate.backup \
  resultados/state-generation-1.json \
  resultados/create-plan.json \
  resultados/update-plan.json \
  > resultados/scan-after-update.jsonl
```

### 49.2. Expectativa

El estado actual contiene la generación 2; otros artefactos pueden conservar la generación 1.

---

## 50. Matriz de evidencias

La matriz resume presencia observada, no una garantía universal de implementación.

### 50.1. Resultados habituales

| **Artefacto** | **Generación esperada** | **Interpretación** |
|---------------|------------------------|--------------------|
| Estado actual | Nueva | Valor administrado vigente |
| Backup local | Anterior | Copia de estado previo |
| Plan de creación JSON | Primera | Decisión original |
| Plan de actualización JSON | Anterior y nueva | Transición preparada |
| Output capturado inicialmente | Primera | Copia independiente |

Comprueba cada fila mediante tus resultados reales.

### 50.2. Precaución

No presupongas backups idénticos en todos los backends y operaciones.

### 50.3. Regla

Una actualización no elimina automáticamente todos los artefactos previos.

---

## 51. Copias en Git

El control de versiones puede convertir una exposición local en una exposición distribuida.

### 51.1. Prevención

Utiliza `.gitignore` y revisa archivos preparados para commit.

### 51.2. Comprobación

```bash
git status --short
git ls-files '*.tfstate' '*.tfstate.*' '*.tfplan'
```

### 51.3. Alcance

Ejecuta estas consultas solo si has inicializado un repositorio para la práctica.

### 51.4. Regla

Borrar un archivo del último commit no elimina necesariamente su contenido del historial.

---

## 52. Artefactos de CI y colaboración

Un pipeline puede producir copias sin que nadie abra el estado manualmente.

### 52.1. Riesgos habituales

Resultados JSON publicados como artifacts.

Planes conservados durante meses.

Logs de depuración accesibles ampliamente.

Adjuntos en incidencias y mensajes de soporte.

### 52.2. Regla

Define acceso, retención y eliminación para cada categoría de artefacto.

### 52.3. Precaución

El enmascaramiento del sistema de CI no reconoce necesariamente todas las transformaciones de un secreto.

---

## 53. Data sources y lectura de secretos

No administrar la creación del secreto no garantiza que Terraform desconozca su contenido.

### 53.1. Patrón de riesgo

Un data source recupera el valor para pasarlo a otro recurso.

### 53.2. Consecuencia

El dato puede entrar en el estado o en otros artefactos según el esquema utilizado.

### 53.3. Regla

Si el objetivo es mantener el valor fuera de Terraform, no lo introduzcas mediante una lectura indirecta.

### 53.4. Revisión

Inspecciona tanto recursos como data sources y outputs.

---

## 54. Referencias en lugar de contenido

Una aplicación puede recibir un identificador y recuperar el valor durante ejecución.

### 54.1. Flujo

Terraform administra el contenedor, su nombre y permisos.

Otro proceso autorizado publica el contenido.

La aplicación recupera el valor utilizando su identidad.

### 54.2. Ventaja

El contenido puede permanecer fuera del estado si Terraform nunca lo recibe.

### 54.3. Regla

La separación exige responsabilidades y controles propios para el proceso externo.

---

## 55. Valores efímeros y argumentos write-only

Versiones recientes de Terraform incorporan capacidades adicionales para determinados flujos.

### 55.1. Compatibilidad

Los valores efímeros requieren Terraform 1.10 o superior.

Los argumentos write-only requieren Terraform 1.11 o superior y soporte específico del proveedor.

### 55.2. Limitación

Un valor efímero no puede utilizarse arbitrariamente donde se exige persistencia.

### 55.3. Regla

No asumas estas capacidades con Terraform 1.6 ni con cualquier recurso AWS 5.x.

---

## 56. Backend remoto y protección

Mover el estado a un backend remoto cambia su almacenamiento, no elimina su sensibilidad.

### 56.1. Controles necesarios

Revisa cifrado, acceso, versionado, bloqueo y auditoría.

### 56.2. Copias históricas

El versionado facilita recuperación, pero también conserva valores antiguos.

### 56.3. LocalStack

Una prueba de backend S3 local no certifica cifrado físico ni IAM equivalente a AWS.

### 56.4. Regla

Evalúa quién puede leer estado actual, versiones anteriores y copias descargadas.

---

## 57. Rotación después de una exposición

Una exposición real requiere actuar sobre la credencial, no solo sobre el archivo.

### 57.1. Procedimiento conceptual

Revoca o rota el valor según el sistema correspondiente.

Investiga acceso y alcance.

Retira copias expuestas conforme a política.

Actualiza consumidores y verifica funcionamiento.

### 57.2. Regla

Reescribir el historial Git no invalida una credencial que ya fue copiada.

### 57.3. Laboratorio

No realices estas acciones contra sistemas reales durante la práctica.

---

## 58. Lo que no debes hacer con el estado

El estado no es un documento que debas editar para ocultar un dato.

### 58.1. Evita

Modificar atributos manualmente sin un procedimiento de recuperación.

Usar `state rm` para “borrar” secretos.

Restaurar copias antiguas sin revisar infraestructura.

Aplicar `state push -force` como primera solución.

### 58.2. Regla

Eliminar la relación de gestión no elimina el recurso ni todas las copias del valor.

---

## 59. Sesión 9: preparar destrucción

La destrucción debe conservar un procedimiento revisable.

### 59.1. Comandos

```bash
python3 scripts/tf-lab.py state pull \
  > copias/before-destroy.tfstate

python3 scripts/tf-lab.py plan -destroy \
  -out=../planes/destroy.tfplan

python3 scripts/tf-lab.py show -json ../planes/destroy.tfplan \
  > resultados/destroy-plan.json
```

### 59.2. Comprobación

Escanea copia y plan de destrucción.

### 59.3. Regla

Un plan para eliminar recursos también puede contener valores sensibles.

---

## 60. Sesión 10: destruir y verificar

Mantén LocalStack disponible hasta completar la eliminación.

### 60.1. Secuencia

```bash
python3 scripts/tf-lab.py show ../planes/destroy.tfplan
python3 scripts/tf-lab.py apply ../planes/destroy.tfplan
python3 scripts/tf-lab.py state list

python3 scripts/scan-artifacts.py \
  app/terraform.tfstate \
  app/terraform.tfstate.backup \
  copias/before-destroy.tfstate \
  resultados/destroy-plan.json
```

### 60.2. Expectativa

El estado actual deja de administrar recursos; las copias pueden conservar generaciones anteriores.

---

## 61. Limpieza de rastros locales

Destruir infraestructura y eliminar artefactos son operaciones diferentes.

### 61.1. Inventario final

Revisa `.sandbox`, planes, resultados, copias y backups.

Comprueba persistencia de LocalStack si la configuraste.

### 61.2. Servicio

Verifica ausencia del parámetro y ejecuta `docker compose down`.

### 61.3. Regla

Eliminar archivos no garantiza borrado físico irrecuperable en discos, snapshots o backups.

---

## 62. Diferencias respecto a AWS real

El laboratorio demuestra propiedades de artefactos y una integración SSM local.

### 62.1. Aspectos adicionales

En AWS real revisa KMS, IAM, backend remoto, auditoría y políticas de retención.

### 62.2. Garantías distintas

El cifrado del servicio no equivale al cifrado del estado.

La lectura local no demuestra autorización equivalente.

### 62.3. Regla

Documenta propiedades comprobadas y propiedades fuera del alcance del emulador.

---

## 63. Ejercicios y evaluación

La evaluación debe demostrar observación sin entregar valores completos.

### 63.1. Ejercicios

1. Explica ocultación, cifrado y no persistencia.
2. Compara plan humano y JSON.
3. Detecta generaciones sin imprimirlas.
4. Identifica copias anteriores tras actualizar.
5. Demuestra exposición mediante output explícito.
6. Diseña un flujo basado en referencias.
7. Explica una respuesta a exposición real.
8. Destruye y revisa rastros restantes.

### 63.2. Entrega

Incluye código, matriz de resultados y límites del escáner; excluye fixtures, estados y planes.

---

## 64. Resumen de la lección

Los valores sensibles necesitan protección durante todo su recorrido, no únicamente en la salida de consola.

### 64.1. Ideas esenciales

- `sensitive` no cifra ni elimina el valor del estado.
- Los planes pueden contener datos anteriores y nuevos.
- Los outputs explícitos pueden revelar contenido.
- Los backups conservan generaciones previas.
- Los data sources también pueden introducir secretos.
- Un backend remoto sigue necesitando controles.
- Destruir recursos no elimina todas las copias.
- La mejor reducción de exposición puede ser no introducir el contenido en Terraform.

### 64.2. Procedimiento recomendado

Clasifica, limita, inspecciona, protege, actualiza y limpia con un inventario de artefactos.

### 64.3. Idea final

**Un proyecto Terraform fiable no confunde un valor oculto con un valor ausente: identifica dónde persiste, quién puede recuperarlo y cómo reducir sus copias durante todo el ciclo de vida.**