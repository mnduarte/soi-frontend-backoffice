import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from '../common/Icon';

/**
 * Instalar la consola en el teléfono, y mantenerla al día sin molestar.
 *
 * Dos comportamientos en un solo lugar, porque los dos dependen del mismo
 * registro del service worker:
 *
 * 1. **Instalar.** El navegador avisa que se puede —y ese aviso llega antes de
 *    que React monte, por eso lo atrapa el script del index.html—, pero no lo
 *    ofrece a la vista: en Android queda enterrado en el menú y en iPhone no
 *    existe. Acá es un ítem más del menú, no un cartel: la consola la usa una
 *    sola persona y ya sabe lo que quiere.
 * 2. **Actualizar.** La versión nueva se destraba sola y entra en la próxima
 *    apertura. Sin cartel: no hay a quién interrumpir, y preguntarle a un
 *    único usuario si quiere lo último es una ceremonia sin sentido.
 */
type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    /** Lo deja el script del index.html, que escucha antes que React. */
    __soiInstalar: EventoInstalacion | null;
  }
}

function yaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function PwaConsola() {
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW();

  const [evento, setEvento] = useState<EventoInstalacion | null>(() => window.__soiInstalar);
  const [instalada, setInstalada] = useState(yaInstalada);
  const [pasosIOS, setPasosIOS] = useState(false);
  const yaAplicada = useRef(false);

  useEffect(() => {
    const alPoder = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    const alInstalar = () => setInstalada(true);
    window.addEventListener('beforeinstallprompt', alPoder);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoder);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  useEffect(() => {
    if (!hayVersionNueva || yaAplicada.current) return;
    yaAplicada.current = true;
    // `false` = no recargar ahora; deja la versión nueva lista para la próxima
    // vez que se abra.
    void updateServiceWorker(false);
  }, [hayVersionNueva, updateServiceWorker]);

  /*
   * Nada que ofrecer si ya está instalada, o si el navegador no avisó que se
   * puede y tampoco es un iPhone (donde nunca avisa).
   *
   * El contenedor se dibuja igual, vacío: es el que se lleva el espacio
   * sobrante del menú y deja el bloque del usuario abajo de todo. Si
   * desapareciera, el usuario se treparía al medio de la barra cada vez que la
   * opción no corresponde.
   */
  const ofrecer = !instalada && (!!evento || esIOS());

  const instalar = async () => {
    if (!evento) {
      setPasosIOS(v => !v);
      return;
    }
    await evento.prompt();
    window.__soiInstalar = null;
    setEvento(null);
  };

  return (
    <div className="consola-instalar">
      {ofrecer && (
        <>
          <button type="button" className="nav-item" onClick={() => void instalar()}>
            <Icon name="smartphone" />
            <span>Instalar en el celular</span>
          </button>
          {pasosIOS && (
            <p className="consola-instalar__pasos">
              Tocá <b>Compartir</b> abajo y elegí <b>Agregar a inicio</b>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
