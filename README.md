# FoodSapp: Tu Nutricionista Personal en WhatsApp 🥗📱

## 📌 El Problema  
Mejorar los hábitos alimenticios puede ser un desafío, especialmente cuando las herramientas disponibles hacen el proceso tedioso.  

Las aplicaciones tradicionales presentan múltiples barreras, como:  

- Requerir la instalación de una app específica.  
- Tener que abrir la aplicación cada vez que se registra una comida.  
- Buscar manualmente cada alimento en bases de datos limitadas.  
- Estimar porciones con medidas poco intuitivas.  
- Dedicar demasiado tiempo a registrar cada comida.  

Estas dificultades llevan a que muchas personas abandonen el seguimiento nutricional después de unos días, perdiendo la oportunidad de mejorar su alimentación de forma sostenida.  

---

## ✅ Nuestra Solución: FoodSapp  
Hemos desarrollado un asistente nutricional inteligente que se integra con la aplicación de mensajería más utilizada: **WhatsApp**.  

### 🔍 ¿Cómo funciona?  
Simplemente envía un mensaje describiendo lo que has comido. Nuestro asistente, **Nutrito**, procesa la información a través de texto, audio o imágenes y analiza automáticamente:  

- **Macronutrientes**: proteínas, carbohidratos y grasas.  
- **Micronutrientes**: información relevante para tu dieta.  
- **Compatibilidad** con tus objetivos personales y restricciones alimentarias.  

---

## 🚀 ¿Por qué es innovador?  
### ✔️ **Accesibilidad sin fricciones**  
No requiere instalar nuevas aplicaciones ni aprender tecnologías complejas.  

### 💬 **Interacción en lenguaje natural**  
Basta con describir tu comida de forma sencilla, por ejemplo:  
*"Desayuné dos huevos y una tostada."*  

### 🎯 **Personalización inteligente**  
Se adapta a tus objetivos nutricionales, ya sea perder peso, ganar masa muscular o mantener una alimentación equilibrada.  

### 🧠 **Análisis contextual avanzado**  
Tiene en cuenta restricciones dietéticas y condiciones médicas específicas.  

### 📊 **Retroalimentación útil**  
Recibe informes periódicos con patrones alimenticios y sugerencias para mejorar tu dieta.  

### 🔄 **Mayor continuidad**  
Al eliminar las barreras tecnológicas, aumenta la probabilidad de mantener un seguimiento nutricional a largo plazo.  

---

## 🎯 Conclusión  
FoodSapp revoluciona el monitoreo de la alimentación, haciendo que el seguimiento nutricional sea tan fácil como enviar un mensaje. Creemos que la tecnología debe **adaptarse a las personas**, y no al revés.  

¿Quieres mejorar tu alimentación sin complicaciones?  
✨ **FoodSapp es tu compañero nutricional en el bolsillo.**  

## Setup

Run the project:
```bash
docker compose up
```


## ⚙️ Configuración  
Para ejecutar FoodSapp, es necesario configurar las siguientes variables de entorno en un archivo **`.env`**:  

```ini
TWO_CHAT_API_KEY=<tu_api_key>
TWO_CHAT_PHONE_NUMBER=<tu_numero_de_whatsapp>
OPENAI_API_KEY=<tu_openai_api_key>
