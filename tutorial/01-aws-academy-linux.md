# Práctica 1 — Publicar GPS Route Viewer en Linux con AWS Academy

**TecNM · Instituto Tecnológico de Tijuana**
Duración estimada: 90 min · Nivel: básico–intermedio

## Objetivo

Crear un servidor Linux (Ubuntu) en la nube de AWS mediante el **AWS Academy Learner Lab**, administrarlo por SSH y publicar la aplicación web *GPS Route Viewer* con **nginx** para que cualquier persona la abra desde su navegador.

## Lo que necesitas

- Acceso a tu curso de **AWS Academy Learner Lab** (invitación del docente).
- Una terminal con `ssh` y `scp`:
  - macOS y Linux: la app *Terminal*.
  - Windows 10/11: *PowerShell* (OpenSSH ya viene incluido).
- El proyecto en tu equipo. En la carpeta del proyecto ejecuta `sh scripts/package.sh`, que genera `dist/public_html.zip`. Si usas Windows sin `sh`, sigue la práctica 2 (Docker) o pide el `.zip` a tu docente.

## Conceptos clave

| Concepto | Qué es |
|---|---|
| **EC2** | Servicio de máquinas virtuales de AWS. Cada máquina es una *instancia*. |
| **AMI** | Imagen del sistema operativo con la que arranca la instancia (usaremos Ubuntu Server 24.04 LTS). |
| **Security Group** | Firewall de la instancia; define qué puertos aceptan conexiones. |
| **Key pair** | Llave criptográfica para entrar por SSH sin contraseña. En Learner Lab se llama `vockey`. |
| **nginx** | Servidor web que entrega los archivos HTML, CSS y JS al navegador. |

> **Importante sobre Learner Lab**
> - Cada sesión dura un tiempo limitado (el contador aparece junto a *Start Lab*). Al terminar, las instancias se **detienen**, pero no se borran.
> - Al volver a iniciar la sesión, la **IP pública cambia**. Revísala de nuevo en la consola de EC2.
> - Tienes un **crédito limitado**. Usa instancias pequeñas (`t2.micro` o `t3.micro`) y **detén** (Stop) la instancia al terminar la práctica.
> - Trabaja en la región **us-east-1 (N. Virginia)**, a menos que tu docente indique otra.

---

## Paso 1 — Iniciar el laboratorio

1. Entra a AWS Academy → tu curso → **Modules** → **Launch AWS Academy Learner Lab**.
2. Presiona **Start Lab** y espera a que el indicador junto a **AWS** cambie de rojo a **verde**.
3. Haz clic en **AWS** para abrir la consola de AWS en otra pestaña.
4. En el mismo panel, abre **AWS Details** y presiona **Download PEM**. Se descarga `labsuser.pem`; guárdalo en una carpeta que puedas encontrar, por ejemplo `~/aws/`.

✅ **Verificación:** la consola de AWS muestra arriba a la derecha la región *N. Virginia*.

## Paso 2 — Crear la instancia EC2

En la consola: **EC2 → Instances → Launch instances**.

| Campo | Valor |
|---|---|
| Name | `gps-route-viewer-<tu-numero-de-control>` |
| AMI | **Ubuntu Server 24.04 LTS** (64-bit x86) |
| Instance type | `t2.micro` o `t3.micro` |
| Key pair | **vockey** |
| Network settings | ☑ *Allow SSH traffic from* → **My IP** · ☑ *Allow HTTP traffic from the internet* |
| Storage | 8 GiB gp3 (valor por defecto) |

Presiona **Launch instance**. Luego entra a **Instances**, selecciona la tuya y copia su **Public IPv4 address**. En esta guía la llamaremos `IP_PUBLICA`.

✅ **Verificación:** *Instance state* = **Running** y *Status check* = **2/2 checks passed** (tarda 1–2 min).

## Paso 3 — Conectarse por SSH

### macOS / Linux

```bash
cd ~/aws
chmod 400 labsuser.pem                 # SSH rechaza llaves con permisos abiertos
ssh -i labsuser.pem ubuntu@IP_PUBLICA
```

### Windows (PowerShell)

```powershell
cd $HOME\aws
icacls labsuser.pem /inheritance:r
icacls labsuser.pem /grant:r "$($env:USERNAME):(R)"
ssh -i labsuser.pem ubuntu@IP_PUBLICA
```

La primera vez SSH pregunta si confías en el servidor; responde `yes`.

✅ **Verificación:** el prompt cambia a algo como `ubuntu@ip-172-31-xx-xx:~$`.

> Alternativa sin terminal: en la consola de EC2 selecciona la instancia → **Connect** → **EC2 Instance Connect** → **Connect**.

## Paso 4 — Reconocer el sistema (comandos Linux básicos)

```bash
whoami                 # usuario actual (ubuntu)
hostnamectl            # nombre del equipo y versión del sistema
lsb_release -a         # versión de Ubuntu
nproc && free -h       # CPUs y memoria
df -h /                # espacio en disco
ip -brief address      # IP privada (la pública la asigna AWS por fuera)
curl -s https://checkip.amazonaws.com   # IP pública vista desde Internet
```

📝 **Anota** en tu reporte la versión de Ubuntu, los CPUs, la memoria y la IP privada.

## Paso 5 — Instalar nginx

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx unzip
systemctl status nginx --no-pager      # debe decir: active (running)
curl -I http://localhost               # HTTP/1.1 200 OK
```

Abre `http://IP_PUBLICA` en tu navegador. Debe aparecer **"Welcome to nginx!"**.

> Si el navegador no carga la página, revisa tres cosas:
> - Que la dirección empiece con `http://` y no con `https://`. Algunos navegadores cambian a HTTPS automáticamente.
> - Que el Security Group tenga una regla *Inbound* para **HTTP (80)** desde `0.0.0.0/0`.

## Paso 6 — Subir la aplicación

En **tu equipo** (otra terminal, no la de SSH), dentro de la carpeta del proyecto:

```bash
sh scripts/package.sh                                    # genera dist/public_html.zip
scp -i ~/aws/labsuser.pem dist/public_html.zip ubuntu@IP_PUBLICA:~/
```

En la **terminal SSH** del servidor:

```bash
sudo rm -rf /var/www/html/*
sudo unzip -o ~/public_html.zip -d /var/www/html
sudo chown -R www-data:www-data /var/www/html
ls -la /var/www/html                    # index.html y la carpeta src/
```

Abre `http://IP_PUBLICA` → aparece **GPS Route Viewer**. Presiona **Cargar ruta demo** o abre directamente `http://IP_PUBLICA/?demo`.

✅ **Verificación:** el mapa muestra la ruta de Tomás Aquino a Otay, el panel indica **16 puntos**, **5.72 km** y **00:05:00**, y al presionar **▶ Reproducir** el vehículo avanza.

### Alternativa: clonar con git

Si el docente publicó el proyecto en un repositorio:

```bash
sudo apt install -y git
git clone https://github.com/tectijuana/OpenVTSmapsTutorial.git ~/gps-route-viewer
sudo cp -r ~/gps-route-viewer/index.html ~/gps-route-viewer/src /var/www/html/
```

## Paso 7 — Revisar los logs del servidor

```bash
sudo tail -f /var/log/nginx/access.log
```

Recarga la página en el navegador y observa una línea por cada archivo solicitado (`index.html`, `main.js`, `leaflet.js`…). Presiona `Ctrl+C` para salir.

📝 **Pregunta:** cuando cargas un CSV propio, ¿aparece alguna petición nueva en el log? Explica por qué. *(Pista: busca el mensaje de privacidad en la interfaz.)*

## Paso 8 (opcional) — Servir la app con Docker en la misma instancia

```bash
sudo systemctl disable --now nginx                 # libera el puerto 80
sudo apt install -y docker.io docker-compose-v2
git clone https://github.com/tectijuana/OpenVTSmapsTutorial.git ~/gps-route-viewer && cd ~/gps-route-viewer
sudo PORT=80 docker compose up -d --build
sudo docker ps
```

> Para usar `docker` sin `sudo`: `sudo usermod -aG docker ubuntu`, luego `exit` y vuelve a entrar por SSH.

Los detalles de Docker están en la [Práctica 2](02-docker-pc-mac.md).

## Paso 9 — Apagar recursos

1. Cierra la sesión SSH con `exit`.
2. En EC2, selecciona la instancia → **Instance state → Stop instance**. Si ya no la vas a usar, elige **Terminate**.
3. En Learner Lab, presiona **End Lab**.

## Entregables

1. Captura de la consola EC2 con tu instancia en estado *Running* y su IP pública.
2. Captura de la terminal SSH con la salida del Paso 4.
3. Captura del navegador mostrando `http://IP_PUBLICA/?demo` con la reproducción a la mitad.
4. Respuesta a la pregunta del Paso 7.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Permission denied (publickey)` | Usuario o llave incorrectos | El usuario es `ubuntu`; usa `labsuser.pem` de **esta** sesión del laboratorio |
| `WARNING: UNPROTECTED PRIVATE KEY FILE` | Permisos abiertos en la llave | `chmod 400 labsuser.pem` (o `icacls` en Windows) |
| `Connection timed out` en SSH | La regla de SSH solo permite tu IP anterior | Edita el Security Group → Inbound → SSH → *My IP* |
| La página no carga | Puerto 80 cerrado o el navegador forzó HTTPS | Agrega la regla HTTP (80) al Security Group; escribe `http://` explícitamente |
| La IP dejó de funcionar | Se reinició el laboratorio | Consulta la nueva IP pública en EC2 |
| El mapa aparece gris | La instancia no tiene salida a Internet o se bloquearon las teselas de OSM | El navegador descarga las teselas directamente; revisa la red de tu equipo |
