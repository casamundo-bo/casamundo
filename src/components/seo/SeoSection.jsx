import React from 'react';

const SeoSection = () => {
  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado con animación sutil */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-2 relative inline-block">
            Calidad y Confort para tu Hogar
            <span className="absolute bottom-0 left-0 w-full h-1 bg-custom-red-600 transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
          </h2>
          <div className="w-24 h-1 bg-custom-red-600 mx-auto my-4"></div>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Descubre nuestra exclusiva colección de edredones y ropa de cama
          </p>
        </div>
        
        {/* Tarjetas con hover effect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border-t-4 border-custom-red-600 transform hover:-translate-y-1 transition-transform duration-300">
            <div className="text-custom-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">Materiales Premium</h3>
            <p className="text-gray-600 text-center">
              Todos nuestros productos están fabricados con los mejores materiales, garantizando durabilidad y 
              confort superior. Nuestros edredones están diseñados para brindarte el mejor descanso posible.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border-t-4 border-custom-red-600 transform hover:-translate-y-1 transition-transform duration-300">
            <div className="text-custom-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">Variedad de Diseños</h3>
            <p className="text-gray-600 text-center">
              Desde edredones lisos hasta calaminados, luminosos e infantiles. Contamos con una amplia gama 
              de diseños y tamaños para adaptarse a cualquier habitación y estilo decorativo.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border-t-4 border-custom-red-600 transform hover:-translate-y-1 transition-transform duration-300">
            <div className="text-custom-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">Envíos a Todo el País</h3>
            <p className="text-gray-600 text-center">
              Realizamos envíos a todo el país con seguimiento en tiempo real. Tu compra llegará segura y en 
              perfectas condiciones a la puerta de tu hogar.
            </p>
          </div>
        </div>
        
        {/* Contenido SEO mejorado */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3 border-gray-200">¿Por qué elegir nuestros productos?</h3>
          <div className="prose prose-lg text-gray-500 max-w-none">
            <p>
              En nuestra tienda encontrarás la mejor selección de edredones, sábanas y mantas del mercado. 
              Nos especializamos en ofrecer productos de alta calidad que combinan durabilidad, estilo y confort.
            </p>
            <p>
              Nuestros edredones están disponibles en diferentes tamaños como TWIN, FULL, QUEEN y KING, 
              adaptándose perfectamente a cualquier cama. Además, contamos con diseños exclusivos que 
              transformarán tu dormitorio en un espacio acogedor y elegante.
            </p>
            <p>
              La satisfacción de nuestros clientes es nuestra prioridad. Por eso, ofrecemos un servicio 
              personalizado y atención al cliente excepcional. Nuestro equipo está disponible para 
              asesorarte en tu compra y resolver cualquier duda que puedas tener.
            </p>
            
            <div className="mt-8">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Nuestras categorías principales:</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5 mt-2">
                <li className="flex items-center">
                  <span className="text-custom-red-600 mr-2">✓</span>
                  Edredones Lisos - Elegancia y simplicidad para cualquier dormitorio
                </li>
                <li className="flex items-center">
                  <span className="text-custom-red-600 mr-2">✓</span>
                  Edredones Calaminados - Textura y diseño superior
                </li>
                <li className="flex items-center">
                  <span className="text-custom-red-600 mr-2">✓</span>
                  Edredones Luminosos - Diseños vibrantes que iluminan tu espacio
                </li>
                <li className="flex items-center">
                  <span className="text-custom-red-600 mr-2">✓</span>
                  Edredones Infantiles - Alegres diseños para los más pequeños
                </li>
                <li className="flex items-center">
                  <span className="text-custom-red-600 mr-2">✓</span>
                  Sábanas - El complemento perfecto para tu descanso
                </li>
                <li className="flex items-center">
                  <span className="text-custom-red-600 mr-2">✓</span>
                  Mantas - Calidez adicional con estilo
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Sección de ubicación con mapa */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Visítanos en nuestra tienda</h3>
            <p className="text-gray-600 mb-6">
              Te invitamos a conocer nuestra tienda física donde podrás ver y sentir la calidad de nuestros productos.
              Nuestro personal estará encantado de asesorarte y ayudarte a encontrar lo que necesitas.
            </p>
          </div>
          
          {/* Mapa responsivo */}
          <div className="w-full h-0 pb-[56.25%] relative">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3825.062483565628!2d-68.22230682527302!3d-16.522942884224182!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915edff4c3f20a3d%3A0x5e2ac1f93cb96c34!2sCasa%20Mundo%20Wilson%20Aliaga!5e0!3m2!1ses!2sbo!4v1747872179057!5m2!1ses!2sbo" 
              className="absolute top-0 left-0 w-full h-full"
              style={{border: 0}} 
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación de Casa Mundo Wilson Aliaga"
            ></iframe>
          </div>
          
          {/* Información de contacto */}
          <div className="p-8 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Horario de atención</h4>
                <p className="text-gray-600">Lunes a Viernes: 9:00 AM - 7:00 PM</p>
                <p className="text-gray-600">Sábados: 9:00 AM - 5:00 PM</p>
                <p className="text-gray-600">Domingos: Cerrado</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Contacto</h4>
                <p className="text-gray-600">Teléfono: (591) 69948298</p>
                <p className="text-gray-600">Email: casamundobolivia@gmail.com</p>
                <p className="text-gray-600">Dirección: Av. Litoral, El Alto, Bolvia</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeoSection;