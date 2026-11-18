/* Victron MultiPlus card for Home Assistant  –  replica of the front panel of a MultiPlus-II (blue panel, black "charger | inverter" window)
 * with its 8 LEDs (off / on / blinking / blinking in opposite phase), the real VE.Bus error code and a plain-language explanation of the LED combination.
 *
 *   type: custom:victron-multiplus-card
 *   title: Victron inverter            # optional text above the panel (no title by default)
 *   language: auto                     # auto (Home Assistant language) | ro | en
 *   layout: full                       # full | leds (only the black LED window, nothing else)
 *   led_blink: 0.65                    # seconds of one blink phase (on or off)
 *   inverter_model: MultiPlus-II       # printed name of the model (this panel is the one of the MultiPlus-II family)
 *   inverter_type: 48/6k5/100-50       # the type code of your unit: volt / watt / amp - AC transfer capacity (e.g. 12/3000/120-32, 24/3000/70-32)
 *   ac_voltage: 230                    # "Inverter 230 V"
 *   inverter_specs / inverter_note     # optional: override the specs line / the note line with free text
 *   entities:
 *     led_mains_on: sensor.victron_mqtt_mains_led     # state off / on / blinking / blinking_inverted (Victron MQTT enum sensors) or numeric 0-3 (see examples/)
 *     led_bulk, led_absorption, led_float, led_inverter_on, led_overload, led_low_battery, led_temperature
 *     vebus_error: sensor.victron_vebus_error         # optional: the raw VE.Bus error code (0 = none), only available from the MQTT topic
 *     alarm_overload, alarm_low_battery, alarm_ripple, alarm_high_temperature, alarm_temperature_sensor, alarm_voltage_sensor,
 *     alarm_high_dc_voltage, alarm_high_dc_current, alarm_grid_lost, alarm_phase_rotation   # optional: the Victron MQTT alarm sensors (no_alarm / warning / alarm)
 *
 * The LED / error decoding follows the MultiPlus-II manual (3.4 LED indications, 6.2 special LED indications, 6.3 VE.Bus codes).
 * Texts are translated (ro, en); to add a language copy one block of I18N. The words printed on the unit itself ("charger", "mains on", ...) stay English, like on the real panel.
 */
(() => {
const VERSION = "1.0.0";

const ALARMS = [   // id, entity key, config name (Victron MQTT: sensors with the states no_alarm / warning / alarm, one per Alarms/* topic of the VE.Bus device)
  ["grid", "alGrid", "alarm_grid_lost"], ["dcI", "alDcI", "alarm_high_dc_current"], ["dcV", "alDcV", "alarm_high_dc_voltage"], ["hiT", "alHiT", "alarm_high_temperature"], ["low", "alLow", "alarm_low_battery"],
  ["over", "alOver", "alarm_overload"], ["phase", "alPhase", "alarm_phase_rotation"], ["ripple", "alRipple", "alarm_ripple"], ["tsens", "alTsens", "alarm_temperature_sensor"], ["vsens", "alVsens", "alarm_voltage_sensor"],
];
const DEF = { ledMains: "", ledBulk: "", ledAbs: "", ledFloat: "", ledInv: "", ledOver: "", ledLow: "", ledTemp: "", vebusErr: "", ...Object.fromEntries(ALARMS.map((a) => [a[1], ""])) };
const NAMES = { ledMains: "led_mains_on", ledBulk: "led_bulk", ledAbs: "led_absorption", ledFloat: "led_float", ledInv: "led_inverter_on", ledOver: "led_overload", ledLow: "led_low_battery", ledTemp: "led_temperature", vebusErr: "vebus_error", ...Object.fromEntries(ALARMS.map((a) => [a[1], a[2]])) };
const SHORT = Object.fromEntries(Object.entries(NAMES).map(([s, l]) => [l, s]));
const normEnt = (e) => { const o = {}; Object.keys(e || {}).forEach((k) => { o[SHORT[k] || k] = e[k]; }); return o; };   // readable or short key -> internal short key
const KEYS = Object.keys(DEF);
const BLINK = 0.65;   // default seconds of one blink phase

// ------------------------------------------------------------------ texts
const I18N = {
  ro: {
    "nodata": "Fără date", "empty": "Alege senzorii LED în editorul cardului.", "aria": "LED-urile invertorului Victron",
    "vebus.t": "Eroare VE.Bus · cod {code}", "vebus.unknown": "Cod fără descriere în manual.",
    "vebus.c1": ["Dispozitiv oprit pentru că altă fază din sistem s-a oprit", "Verifică faza care a căzut."],
    "vebus.c3": ["Nu s-au găsit toate dispozitivele așteptate (sau sunt mai multe)", "Sistem configurat greșit: reconfigurează-l. Verifică cablurile de comunicație, oprește tot și repornește."],
    "vebus.c4": ["Nu a fost detectat niciun alt dispozitiv", "Verifică cablurile de comunicație."], "vebus.c5": ["Supratensiune la ieșirea de curent alternativ (AC-out)", "Verifică cablurile de curent alternativ."],
    "vebus.c10": ["Problemă de sincronizare a timpului în sistem", "Nu ar trebui să apară la o instalare corectă. Verifică cablurile de comunicație."],
    "vebus.c14": ["Dispozitivul nu poate transmite date", "Verifică cablurile de comunicație (posibil scurtcircuit)."],
    "vebus.c17": ["Un dispozitiv și-a asumat statutul de «principal» pentru că dispozitivul principal inițial a eșuat", "Verifică unitatea defectă și cablurile de comunicație."],
    "vebus.c18": ["S-a produs supratensiune", "Verifică cablurile de curent alternativ."], "vebus.c22": ["Dispozitivul nu poate funcționa ca «secundar»", "Model depășit și nepotrivit: trebuie înlocuit."],
    "vebus.c24": ["S-a activat protecția sistemului de comutare (switch-over)", "Nu ar trebui să apară la o instalare corectă. Oprește tot și repornește; dacă revine, verifică instalarea. Soluție posibilă: crește limita inferioară a tensiunii de intrare AC la 210 V (din fabrică e 180 V)."],
    "vebus.c25": ["Incompatibilitate de firmware: un dispozitiv conectat e prea vechi", "Oprește tot, pornește dispozitivul cu eroarea, apoi pe rând celelalte; actualizează firmware-ul ultimului pornit."],
    "vebus.c26": ["Eroare internă", "Nu ar trebui să apară. Oprește tot și repornește; dacă persistă, contactează Victron."],
    "equalize.t": "Egalizare (equalize)", "equalize.d": "„bulk” și „absorption” clipesc împreună. Dacă nu ai pornit egalizarea, e eroare «voltage sense»: tensiunea măsurată diferă cu mai mult de 7 V de borne, verifică conexiunea. Unitatea merge normal.",
    "tempsens.t": "Senzor temperatură baterie suspect", "tempsens.d": "Valoare extrem de improbabilă: senzorul e probabil defect sau conectat greșit. Unitatea merge normal.",
    "bulkprot.t": "Bulk protection", "bulkprot.d": "Timpul maxim de bulk (10 h) a fost depășit, încărcătorul nu mai încarcă. Verifică bateriile; resetezi oprind și pornind unitatea.",
    "okinv.t": "Cod OK VE.Bus · poate funcționa ca invertor", "okinv.d": "Unitatea e în regulă, dar un alt dispozitiv din sistem are o eroare.",
    "okchg.t": "Cod OK VE.Bus · poate încărca", "okchg.d": "Unitatea e în regulă, dar un alt dispozitiv din sistem are o eroare.",
    "batsafe.t": "BatterySafe", "batsafe.d": "Rețeaua e conectată și încărcătorul merge, dar tensiunea de absorbție setată nu a fost atinsă încă.",
    "bulk.t": "Încărcare Bulk", "bulk.d": "Rețeaua e conectată, încărcătorul lucrează în faza bulk.",
    "absorption.t": "Încărcare Absorption", "absorption.d": "Rețeaua e conectată, încărcătorul lucrează în faza de absorbție.",
    "float.t": "Încărcare Float", "float.d": "Rețeaua e conectată, încărcătorul menține bateria în float.",
    "invon.t": "Invertor pornit", "invon.d": "Consumatorii sunt alimentați de invertor.",
    "powerassist.t": "PowerAssist", "powerassist.d": "Consumul depășește curentul maxim de intrare setat; invertorul ajută cu curentul lipsă.",
    "invblink.t": "LED „inverter on” clipește", "invblink.d": "Nu e descris în manual.",
    "powercontrol.t": "PowerControl / sincronizare rețea", "powercontrol.d": "„mains on” clipește: curentul de intrare e la limita setată (încărcare 0 A), sau, dacă nu e tensiune la ieșire, unitatea respinge rețeaua / se sincronizează.",
    "mainson.t": "Rețea conectată", "mainson.d": "Încărcătorul nu încarcă în acest moment.",
    "overlow.t": "Pre-alarmă supraîncărcare + baterie slabă", "overlow.d": "Bateria e aproape descărcată și puterea nominală a invertorului e depășită.",
    "preripple.t": "Pre-alarmă ripple", "preripple.d": "Tensiunea ondulată (ripple) la bornele bateriei e prea mare.",
    "alarmripple.t": "Alarmă ripple", "alarmripple.d": "Invertorul s-a oprit din cauza tensiunii ondulate prea mari la bornele bateriei.",
    "alarmover.t": "Alarmă supraîncărcare", "alarmover.d": "Invertorul s-a oprit: supraîncărcare sau scurtcircuit. Reduce sarcina.",
    "preover.t": "Pre-alarmă supraîncărcare", "preover.d": "Puterea nominală a invertorului e depășită. Reduce sarcina.",
    "alarmlow.t": "Alarmă baterie slabă", "alarmlow.d": "Invertorul s-a oprit: tensiunea bateriei e prea mică. Încarcă bateria / verifică conexiunile.",
    "prelow.t": "Pre-alarmă baterie slabă", "prelow.d": "Tensiunea bateriei scade, bateria e aproape descărcată.",
    "alarmtemp.t": "Alarmă temperatură", "alarmtemp.d": "Invertorul s-a oprit: temperatura internă e prea mare. Asigură ventilație sau reduce sarcina.",
    "pretemp.t": "Pre-alarmă temperatură", "pretemp.d": "Temperatura internă se apropie de nivelul critic.",
    "unknown.t": "Combinație LED necunoscută", "unknown.d": "Combinația nu e descrisă în manual.",
    "standby.t": "Unitate oprită / în așteptare", "standby.d": "Toate LED-urile sunt stinse.",
    "al.w": "Avertizare: {n}", "al.a": "Alarmă: {n}", "an.grid": "Rețea pierdută", "an.dcI": "Curent DC mare", "an.dcV": "Tensiune DC mare", "an.hiT": "Temperatură mare", "an.low": "Baterie slabă", "an.over": "Supraîncărcare", "an.phase": "Rotația fazelor", "an.ripple": "Ripple", "an.tsens": "Senzor de temperatură", "an.vsens": "Voltage sense",
    "ad.grid": "Intrarea AC s-a pierdut: nu există rețea.", "ad.dcI": "Curentul DC (al bateriei) e prea mare.", "ad.dcV": "Tensiunea DC (a bateriei) e prea mare.", "ad.phase": "Rotația fazelor de la intrarea AC e greșită.", "ad.tsens": "Senzorul de temperatură al bateriei raportează o problemă: verifică-l și cablajul lui.", "ad.vsens": "Conexiunea de voltage sense raportează o problemă: verifică cablajul ei.",
    "ed.alarms": "Alarme (opțional)",
    "e.alGrid": "Alarmă: rețea pierdută", "e.alDcI": "Alarmă: curent DC mare", "e.alDcV": "Alarmă: tensiune DC mare", "e.alHiT": "Alarmă: temperatură mare", "e.alLow": "Alarmă: baterie slabă", "e.alOver": "Alarmă: supraîncărcare", "e.alPhase": "Alarmă: rotația fazelor", "e.alRipple": "Alarmă: ripple", "e.alTsens": "Alarmă: senzor de temperatură", "e.alVsens": "Alarmă: voltage sense",
    "ed.layout": "Aspect", "ed.l.full": "Panou complet", "ed.l.leds": "Doar fereastra neagră cu LED-uri",
    "ed.detect": "🔍 Detectează entitățile", "ed.hint": "Alege senzorii LED (stări off / on / blinking / blinking_inverted sau numere 0-3). Detectarea caută după nume și după opțiunile senzorului.", "ed.found": "{n} entități completate automat – verifică-le.", "ed.none": "Nu am găsit entități noi.",
    "ed.title": "Titlu (opțional)", "ed.language": "Limbă", "ed.auto": "Automat (limba din Home Assistant)", "ed.blink": "Faza de clipire (secunde)", "ed.model": "Nume model", "ed.type": "Cod tip (ex. 48/6k5/100-50)", "ed.acv": "Tensiune invertor (V)", "ed.specs": "Linia de specificații (text liber)", "ed.note": "Linia de notă (text liber)", "ed.entities": "Entități",
    "e.ledMains": "LED „mains on”", "e.ledBulk": "LED „bulk”", "e.ledAbs": "LED „absorption”", "e.ledFloat": "LED „float”", "e.ledInv": "LED „inverter on”", "e.ledOver": "LED „overload”", "e.ledLow": "LED „low battery”", "e.ledTemp": "LED „temperature”", "e.vebusErr": "Cod eroare VE.Bus (opțional)",
  },
  en: {
    "nodata": "No data", "empty": "Choose the LED sensors in the card editor.", "aria": "LEDs of the Victron inverter",
    "vebus.t": "VE.Bus error · code {code}", "vebus.unknown": "Code not described in the manual.",
    "vebus.c1": ["Device switched off because another phase in the system has switched off", "Check the failing phase."],
    "vebus.c3": ["Not all, or more than, the expected devices were found in the system", "System not configured correctly: reconfigure it. Check the communication cables, switch everything off and on again."],
    "vebus.c4": ["No other device detected", "Check the communication cables."], "vebus.c5": ["Overvoltage on AC-out", "Check the AC cables."],
    "vebus.c10": ["System time synchronisation problem", "Should not occur in a correct installation. Check the communication cables."],
    "vebus.c14": ["Device cannot transmit data", "Check the communication cables (possible short circuit)."],
    "vebus.c17": ["One of the devices took over as master because the original master failed", "Check the failing unit and the communication cables."],
    "vebus.c18": ["Overvoltage occurred", "Check the AC cables."], "vebus.c22": ["This device cannot function as slave", "Obsolete or unsuitable model: replace it."],
    "vebus.c24": ["Switch-over system protection initiated", "Should not occur in a correct installation. Switch everything off and on again; if it recurs, check the installation. Possible fix: raise the lower limit of the AC input voltage to 210 VAC (the factory setting is 180 VAC)."],
    "vebus.c25": ["Firmware incompatibility: a connected device is not up to date enough", "Switch everything off, switch on the device with the error, then the others one by one; update the firmware of the last one switched on."],
    "vebus.c26": ["Internal error", "Should not occur. Switch everything off and on again; contact Victron if it persists."],
    "equalize.t": "Equalize charging", "equalize.d": "“bulk” and “absorption” blink together. If you did not start equalisation, this is a “voltage sense” error: the measured voltage deviates by more than 7 V from the terminals, check the connection. The unit keeps working normally.",
    "tempsens.t": "Battery temperature sensor suspect", "tempsens.d": "Extremely unlikely reading: the sensor is probably defective or wired wrongly. The unit keeps working normally.",
    "bulkprot.t": "Bulk protection", "bulkprot.d": "The maximum bulk time (10 h) was exceeded, the charger stopped charging. Check the batteries; reset by switching the unit off and on.",
    "okinv.t": "VE.Bus OK code · can run as inverter", "okinv.d": "This unit is fine, but another device in the system has an error.",
    "okchg.t": "VE.Bus OK code · can charge", "okchg.d": "This unit is fine, but another device in the system has an error.",
    "batsafe.t": "BatterySafe", "batsafe.d": "Mains is connected and the charger is on, but the set absorption voltage has not been reached yet.",
    "bulk.t": "Bulk charging", "bulk.d": "Mains is connected, the charger is in the bulk phase.",
    "absorption.t": "Absorption charging", "absorption.d": "Mains is connected, the charger is in the absorption phase.",
    "float.t": "Float charging", "float.d": "Mains is connected, the charger keeps the battery in float.",
    "invon.t": "Inverter on", "invon.d": "The loads are powered by the inverter.",
    "powerassist.t": "PowerAssist", "powerassist.d": "The load exceeds the set maximum input current; the inverter supplies the missing current.",
    "invblink.t": "“inverter on” LED blinks", "invblink.d": "Not described in the manual.",
    "powercontrol.t": "PowerControl / mains synchronising", "powercontrol.d": "“mains on” blinks: the input current is at the set limit (charge 0 A), or, with no output voltage, the unit is rejecting the mains or synchronising.",
    "mainson.t": "Mains connected", "mainson.d": "The charger is not charging at the moment.",
    "overlow.t": "Overload + low battery pre-alarm", "overlow.d": "The battery is almost exhausted and the nominal power of the inverter is exceeded.",
    "preripple.t": "Ripple pre-alarm", "preripple.d": "The ripple voltage on the battery terminals is too high.",
    "alarmripple.t": "Ripple alarm", "alarmripple.d": "The inverter switched off because of excessive ripple voltage on the battery terminals.",
    "alarmover.t": "Overload alarm", "alarmover.d": "The inverter switched off: overload or short circuit. Reduce the load.",
    "preover.t": "Overload pre-alarm", "preover.d": "The nominal power of the inverter is exceeded. Reduce the load.",
    "alarmlow.t": "Low battery alarm", "alarmlow.d": "The inverter switched off: battery voltage too low. Charge the battery and check the connections.",
    "prelow.t": "Low battery pre-alarm", "prelow.d": "The battery voltage is getting low, the battery is almost exhausted.",
    "alarmtemp.t": "Temperature alarm", "alarmtemp.d": "The inverter switched off: internal temperature too high. Provide ventilation or reduce the load.",
    "pretemp.t": "Temperature pre-alarm", "pretemp.d": "The internal temperature is approaching a critical level.",
    "unknown.t": "Unknown LED combination", "unknown.d": "The combination is not described in the manual.",
    "standby.t": "Unit off / standby", "standby.d": "All LEDs are off.",
    "al.w": "Warning: {n}", "al.a": "Alarm: {n}", "an.grid": "Grid lost", "an.dcI": "High DC current", "an.dcV": "High DC voltage", "an.hiT": "High temperature", "an.low": "Low battery", "an.over": "Overload", "an.phase": "Phase rotation", "an.ripple": "Ripple", "an.tsens": "Temperature sensor", "an.vsens": "Voltage sense",
    "ad.grid": "The AC input is lost: there is no mains.", "ad.dcI": "The DC (battery) current is too high.", "ad.dcV": "The DC (battery) voltage is too high.", "ad.phase": "The phase rotation of the AC input is wrong.", "ad.tsens": "The battery temperature sensor reports a problem: check it and its wiring.", "ad.vsens": "The voltage sense connection reports a problem: check its wiring.",
    "ed.alarms": "Alarms (optional)",
    "e.alGrid": "Alarm: grid lost", "e.alDcI": "Alarm: high DC current", "e.alDcV": "Alarm: high DC voltage", "e.alHiT": "Alarm: high temperature", "e.alLow": "Alarm: low battery", "e.alOver": "Alarm: overload", "e.alPhase": "Alarm: phase rotation", "e.alRipple": "Alarm: ripple", "e.alTsens": "Alarm: temperature sensor", "e.alVsens": "Alarm: voltage sense",
    "ed.layout": "Layout", "ed.l.full": "Full panel", "ed.l.leds": "Only the black LED window",
    "ed.detect": "🔍 Detect entities", "ed.hint": "Choose the LED sensors (states off / on / blinking / blinking_inverted, or numbers 0-3). Detection searches by name and by the sensor options.", "ed.found": "{n} entities filled in automatically – please check them.", "ed.none": "No new entities found.",
    "ed.title": "Title (optional)", "ed.language": "Language", "ed.auto": "Automatic (Home Assistant language)", "ed.blink": "Blink phase (seconds)", "ed.model": "Model name", "ed.type": "Type code (e.g. 48/6k5/100-50)", "ed.acv": "Inverter voltage (V)", "ed.specs": "Specifications line (free text)", "ed.note": "Note line (free text)", "ed.entities": "Entities",
    "e.ledMains": "“mains on” LED", "e.ledBulk": "“bulk” LED", "e.ledAbs": "“absorption” LED", "e.ledFloat": "“float” LED", "e.ledInv": "“inverter on” LED", "e.ledOver": "“overload” LED", "e.ledLow": "“low battery” LED", "e.ledTemp": "“temperature” LED", "e.vebusErr": "VE.Bus error code (optional)",
  },
};
const langOf = (hass, cfg) => { const w = String((cfg && cfg.language && cfg.language !== "auto" ? cfg.language : (hass && ((hass.locale && hass.locale.language) || hass.language))) || "en").toLowerCase().slice(0, 2); return I18N[w] ? w : "en"; };
const tr = (lang, k, p) => { const s = (I18N[lang] && I18N[lang][k]) ?? I18N.en[k] ?? k; return typeof s === "string" && p ? s.replace(/\{(\w+)\}/g, (m, n) => (p[n] ?? m)) : s; };

// ------------------------------------------------------------------ panel
const LEDS = [   // id, entity key, centre x / y in the 512x252 black window, colour, label printed on the unit
  ["mains", "ledMains", 45, 74, "#45f50a", "mains on"], ["bulk", "ledBulk", 45, 120, "#fdb300", "bulk"], ["abs", "ledAbs", 45, 166, "#fdb300", "absorption"], ["float", "ledFloat", 45, 212, "#fdb300", "float"],
  ["inv", "ledInv", 309, 74, "#45f50a", "inverter on"], ["over", "ledOver", 309, 120, "#ff2a14", "overload"], ["low", "ledLow", 309, 166, "#ff2a14", "low battery"], ["temp", "ledTemp", 309, 212, "#ff2a14", "temperature"],
];
const lighten = (hex, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) + (255 - parseInt(hex.slice(i, i + 2), 16)) * k).toString(16).padStart(2, "0")).join("");   // mix a colour with white (k 0..1)
const ledSvg = () => `<svg class="ledsvg" viewBox="0 0 512 252" role="img"><title data-k="tt"></title><rect class="lbg" x="1" y="1" width="510" height="250" rx="22"/>
  <defs>${LEDS.map(([id, , , , c]) => { const w = lighten(c, c === "#ff2a14" ? 0.75 : 1); return `<radialGradient id="lgh-${id}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset=".32" stop-color="${c}" stop-opacity=".5"/><stop offset=".62" stop-color="${c}" stop-opacity=".16"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><radialGradient id="lgc-${id}"><stop offset="0" stop-color="${w}"/><stop offset=".22" stop-color="${w}"/><stop offset=".42" stop-color="${lighten(c, 0.5)}"/><stop offset=".68" stop-color="${c}"/><stop offset="1" stop-color="${c}"/></radialGradient>`; }).join("")}</defs>
  <text class="lti" x="37" y="42">charger</text><text class="lti" x="302" y="42">inverter</text>
  ${LEDS.map(([id, key, x, y, c, t]) => `<g class="lg" data-led="${id}" data-m="${key}" style="--c:${c}"><title>${t}</title><circle class="lb" cx="${x}" cy="${y}" r="9.5"/><g class="lt"><circle class="lh" cx="${x}" cy="${y}" r="30" fill="url(#lgh-${id})"/><circle class="lc" cx="${x}" cy="${y}" r="10" fill="url(#lgc-${id})"/></g><text class="ltx" x="${x + 26}" y="${y + 7}">${t}</text></g>`).join("")}</svg>`;
// Victron type code "48/6k5/100-50" = 48 V battery, 6.5 kW, 100 A charger, 50 A AC transfer (MultiPlus-II 12/3000/120-32, 24/3000/70-32, ...). Missing parts are left out.
const parseType = (t) => { const m = String(t || "").match(/(\d+)\s*\/\s*([\d.,]+k?\d*)\s*\/\s*(\d+)(?:\s*-\s*(\d+))?/i); return m ? { v: m[1], p: m[2], a: m[3], t: m[4] || "" } : null; };
const DEF_TYPE = "48/6k5/100-50";
// effective texts of the panel (config wins over the type code, the type code over the defaults)
const vicTexts = (c) => {
  const ty = parseType(c.inverter_type) || (c.inverter_specs ? null : parseType(DEF_TYPE)), acv = c.ac_voltage ?? 230;
  return { model: c.inverter_model ?? "MultiPlus-II", specs: c.inverter_specs ?? (ty ? `${ty.v} volt | ${ty.p} watt | ${ty.a} amp` : ""), note: c.inverter_note ?? [ty && ty.t ? `AC transfer capacity: ${ty.t}A` : "", acv ? `Inverter ${acv}V` : ""].filter(Boolean).join(" | ") };
};
// name block on the left of the blue front panel: model, "48 volt | 6k5 watt | 100 amp", note. The words are printed on the unit (in English), so they are not translated
const vicName = (c) => {
  const esc = (t) => String(t).replace(/[&<>]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[x])), { model, specs: sp, note } = vicTexts(c),
    specs = String(sp).split("|").map((x) => x.trim()).filter(Boolean).map((x) => { const m = x.match(/^([\d.,]+k?\d*)\s*(.*)$/i); return m ? `<span class="sp"><i>${esc(m[1])}</i><sup>${esc(m[2])}</sup></span>` : `<span class="sp"><i>${esc(x)}</i></span>`; }).join('<u class="vb"></u>');
  return `<div class="vn"><b>${esc(model)}</b>${specs ? `<span class="vs">${specs}</span>` : ""}${note ? `<small>${String(note).split("|").map((t, i, a) => `<span>${esc(t.trim())}${i < a.length - 1 ? " |" : ""}</span>`).join(" ")}</small>` : ""}</div>`;
};
// state of one LED entity -> 0 off / 1 on / 2 blinking / 3 blinking inverted, -1 when unknown (no entity, unavailable)
const ledVal = (s) => {
  if (!s) return -1; const t = String(s.state).trim().toLowerCase(); if (!t || t === "unavailable" || t === "unknown" || t === "none") return -1;
  if (/^\d+$/.test(t)) { const n = +t; return n <= 3 ? n : -1; }
  if (/invert|opposit|anti/.test(t)) return 3; if (/blink|flash|flick|clip/.test(t)) return 2; if (/^(on|true|lit|1|aprins|activ)/.test(t)) return 1; if (/^(off|false|stins|inactiv|0)/.test(t)) return 0; return -1;
};
// state of one alarm entity -> 0 no alarm / 1 warning / 2 alarm, -1 when unknown
const alarmVal = (s) => {
  if (!s) return -1; const t = String(s.state).trim().toLowerCase(); if (!t || t === "unavailable" || t === "unknown" || t === "none") return -1;
  if (/^[012]$/.test(t)) return +t; if (t === "no_alarm" || t === "off" || t === "false" || t === "ok" || t === "normal") return 0; if (t === "warning" || t === "warn") return 1; if (t === "alarm" || t === "on" || t === "true") return 2; return -1;
};
const AL_D = { over: ["preover.d", "alarmover.d"], low: ["prelow.d", "alarmlow.d"], hiT: ["pretemp.d", "alarmtemp.d"], ripple: ["preripple.d", "alarmripple.d"] };   // alarms that have the same explanation as the LED combination
// severity: -1 idle, 0 normal operation, 1 note, 2 warning / pre-alarm, 3 alarm. Items are text keys (see I18N), translated when drawn.
function decodeLeds(L, vErr, A) {   // vErr: raw VebusError code (NaN when there is no such sensor); A: alarm sensors {id: -1 unknown / 0 / 1 warning / 2 alarm}
  const out = [], add = (sev, k, p) => out.push({ sev, k, p }), has = (id) => !!A && A[id] >= 1;   // an alarm sensor that reports a warning / alarm
  const on = (x) => x === 1, bl = (x) => x >= 2, lit = (x) => x >= 1, lvl = (x) => (x === 1 ? 2 : x >= 2 ? 1 : 0);   // lvl: VE.Bus table level 0 off / 1 flashing / 2 on
  const { mains: m, bulk: b, abs: a, float: f, inv: i, over: ov, low: lo, temp: te } = L, chg = [b, a, f], fl = chg.filter(bl);
  // VE.Bus error: "inverter on" flashes and the flashing bulk / absorption / float LEDs are in phase opposition to it (no AC output); code = 9 * bulk + 3 * absorption + float
  const known = !isNaN(vErr), vebus = known ? vErr > 0 : bl(i) && chg.some(lit) && (fl.length ? fl.every((x) => x !== i) : m === 0);
  if (vebus) add(3, "vebus", { code: known ? vErr : 9 * lvl(b) + 3 * lvl(a) + lvl(f) });
  else {
    if (bl(b) && b === a && !lit(f)) add(1, "equalize");
    else if (bl(a) && a === f && !lit(b)) { if (!has("tsens")) add(2, "tempsens"); }
    else if (bl(b) && !lit(a) && !lit(f)) { if (on(m)) add(2, "bulkprot"); else if (!lit(i)) add(1, "okinv"); }
    else if (bl(f) && !lit(a) && !lit(b) && !lit(i)) add(1, "okchg");
    else if (on(b) && on(a)) add(0, "batsafe");
    else if (on(b)) add(0, "bulk");
    else if (on(a)) add(0, "absorption");
    else if (on(f)) add(0, "float");
    if (on(i)) add(0, "invon");
    else if (bl(i) && on(m)) add(0, "powerassist");
    else if (bl(i) && !lit(m) && !chg.some(lit)) add(1, "invblink");
    if (bl(m)) add(1, "powercontrol");
    else if (on(m) && !chg.some(lit) && !lit(i)) add(0, "mainson");
  }
  // alarms read from the LEDs; an alarm sensor that is itself reporting a warning / alarm for the same condition replaces the LED-derived text (if it says "no alarm", what the LEDs show still counts)
  const led = [], addL = (sev, k, f) => led.push({ sev, k, f });
  if (bl(ov) && bl(lo)) { if (ov !== lo) addL(2, "overlow", ["over", "low"]); else addL(2, "preripple", ["ripple"]); }
  else if (on(ov) && on(lo)) addL(3, "alarmripple", ["ripple"]);
  else {
    if (on(ov)) addL(3, "alarmover", ["over"]); else if (bl(ov)) addL(2, "preover", ["over"]);
    if (on(lo)) addL(3, "alarmlow", ["low"]); else if (bl(lo)) addL(2, "prelow", ["low"]);
  }
  if (on(te)) addL(3, "alarmtemp", ["hiT"]); else if (bl(te)) addL(2, "pretemp", ["hiT"]);
  led.forEach((x) => { if (!x.f.some(has)) add(x.sev, x.k); });
  Object.keys(A || {}).forEach((id) => { if (A[id] >= 1) add(A[id] >= 2 ? 3 : 2, "al", { id, w: A[id] === 1 }); });
  if (!out.length) { const any = Object.values(L).some(lit); add(any ? 1 : -1, any ? "unknown" : "standby"); }
  return out.sort((x, y) => y.sev - x.sev);
}
const SEVC = { "-1": "var(--dim)", 0: "#35d49a", 1: "#7dd3fc", 2: "#ffd166", 3: "#ff6464" };

const FAM = '"VMP Sans","Alegreya Sans","Myriad Pro","Segoe UI",system-ui,sans-serif';
const CSS = `
:host{display:block;--txt:var(--primary-text-color,#e6e9ee);--dim:var(--secondary-text-color,#8d96a3)}
*{box-sizing:border-box}
ha-card{padding:var(--vmp-card-padding,18px);container:sc/inline-size;overflow:hidden}
.st{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--dim);margin:0 0 8px 2px}.qsum{text-transform:none;letter-spacing:.3px;font-size:11.5px}
.vic2{position:relative;overflow:hidden;border-radius:18px;padding:20px 12px 12px;background:linear-gradient(180deg,#2c74d6,#1f5db6);border:1px solid rgba(255,255,255,.14);color:#fff}
.vtop{position:absolute;left:0;right:0;top:0;height:6px;background:#f28c28}.vh{display:flex;align-items:center;gap:12px}
.vn{flex:1 1 0;min-width:0;font-family:${FAM}}.vn b{display:block;font-size:26px;font-weight:700;letter-spacing:.2px;line-height:1.05}.vs{display:flex;align-items:center;gap:5px;margin-top:6px;font-size:20px;font-weight:700;white-space:nowrap;line-height:1.1}.vs i{font-style:normal}.sp{display:inline-flex;align-items:flex-end;gap:2px}.vb{display:inline-block;width:2.5px;height:1.5em;border-radius:2px;background:currentColor;text-decoration:none}
.vs sup{display:inline-block;writing-mode:vertical-rl;transform:rotate(180deg);font-size:6.3px;font-weight:700;letter-spacing:.8px;line-height:1;text-transform:uppercase;opacity:.92;margin-bottom:2px}.vn small span{white-space:nowrap}.vn small{display:block;margin-top:10px;font-size:12px;line-height:15px;font-weight:500;opacity:.92}
.ledsvg{display:block;flex:0 0 auto;width:min(322px,67%);height:auto;margin-left:auto}.lbg{fill:#0b0c0e;stroke:rgba(0,0,0,.45);stroke-width:2}
.lti{font:700 36px/1 ${FAM};fill:#cdd2d8;letter-spacing:.5px}.ltx{font:500 21px/1 ${FAM};fill:#e9ecef}
.lg{cursor:pointer}.lg .lb{fill:#ece3c8;fill-opacity:.82;stroke:#fff;stroke-opacity:.2}.lg.na{opacity:.4}
.lg .lt{opacity:0}
.lg.on .lt{opacity:1}.lg.bk .lt{animation:lbk var(--bp,1.3s) steps(1,end) infinite}.lg.bi .lt{animation:lbi var(--bp,1.3s) steps(1,end) infinite}
@keyframes lbk{0%{opacity:1}50%{opacity:0}}@keyframes lbi{0%{opacity:0}50%{opacity:1}}
.lrs{margin-top:12px;display:flex;flex-direction:column;gap:8px;padding:9px 11px;border-radius:12px;background:rgba(6,18,40,.38)}.lr{display:flex;gap:10px;align-items:flex-start;padding:2px 4px}.lr i{flex:0 0 auto;width:9px;height:9px;border-radius:50%;margin-top:5px}.lr b{display:block;font-size:13px;font-weight:500;color:#fff}.lr span{display:block;font-size:11.5px;line-height:15px;color:rgba(255,255,255,.72);margin-top:1px}
ha-card.only{padding:0;background:none;box-shadow:none;border:none;overflow:visible}.only .ledsvg{width:100%;max-width:none;margin:0}
@container sc (max-width:430px){.vh{flex-direction:column;align-items:stretch}.ledsvg{width:100%;margin:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.lg.bk .lt,.lg.bi .lt{opacity:.55}}
`;

// ------------------------------------------------------------------ card
class VictronMultiplusCard extends HTMLElement {
  static getStubConfig() { return {}; }
  static getConfigElement() { return document.createElement("victron-multiplus-card-editor"); }
  setConfig(cfg) {
    this._cfg = { ...(cfg || {}) }; this._E = { ...DEF, ...normEnt(cfg && cfg.entities) };
    this._bp = Math.round(2 * 1000 * (+this._cfg.led_blink > 0 ? +this._cfg.led_blink : BLINK));   // one blink cycle = 2 x led_blink seconds
    this._sig = ""; this._build();
  }
  _only() { return !!this._cfg && ["leds", "light", "compact"].includes(this._cfg.layout); }   // only the black LED window
  getCardSize() { return this._only() ? 3 : 6; }
  getGridOptions() { return this._only() ? { columns: 6, min_columns: 3 } : { columns: 12, min_columns: 6 }; }
  set hass(h) { this._hass = h; if (this._built) this._update(); }
  _s(k) { return this._hass && this._E[k] ? this._hass.states[this._E[k]] : undefined; }
  _more(k) { const id = this._E[k]; if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true })); }

  _build() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    root.innerHTML = this._only() ? `<style>${CSS}</style><ha-card class="only">${ledSvg()}</ha-card>` : `<style>${CSS}</style><ha-card>${this._cfg.title ? `<div class="st"><span data-k="title"></span></div>` : ""}<div class="vic2"><i class="vtop"></i><div class="vh">${vicName(this._cfg)}${ledSvg()}</div><div class="lrs" data-k="st"></div></div></ha-card>`;
    this._r = root; this.style.setProperty("--bp", this._bp / 1000 + "s");
    root.addEventListener("click", (e) => { const m = e.target.closest("[data-m]"); if (m) this._more(m.dataset.m); });
    this._built = true; if (this._hass) this._update();
  }

  _update() {
    const r = this._r, lang = langOf(this._hass, this._cfg), st = (k) => { const s = this._s(k); return s ? s.state : "-"; };
    const sig = lang + "|" + KEYS.map(st).join("|"); if (sig === this._sig) return; this._sig = sig;
    const L = {}; let known = 0;
    LEDS.forEach(([id, key]) => {
      const g = r.querySelector(`[data-led="${id}"]`), v = ledVal(this._s(key)), cls = "lg" + (v === 1 ? " on" : v === 2 ? " bk" : v === 3 ? " bi" : "") + (v < 0 ? " na" : "");
      L[id] = Math.max(0, v); if (v >= 0) known++;
      if (g.getAttribute("class") !== cls) { g.setAttribute("class", cls); if (v >= 2) g.querySelector(".lt").style.animationDelay = `${-(Date.now() % this._bp) / 1000}s`; }   // wall-clock aligned, so every blinking LED (and the inverted ones) keep the same phase
    });
    const ve = this._s("vebusErr"), vErr = ve && /^\d+$/.test(String(ve.state).trim()) ? +ve.state : NaN, A = {}; ALARMS.forEach(([id, key]) => { A[id] = alarmVal(this._s(key)); });
    const items = known ? decodeLeds(L, vErr, A) : [{ sev: -1, k: "nodata" }];
    const txt = (x) => {   // [title, detail] of one item in the current language
      if (x.k === "nodata") return [tr(lang, "nodata"), KEYS.some((k) => this._E[k]) ? "" : tr(lang, "empty")];
      if (x.k === "vebus") { const c = I18N[lang]["vebus.c" + x.p.code] || I18N.en["vebus.c" + x.p.code]; return [tr(lang, "vebus.t", x.p), c ? `${c[0]}. ${c[1]}` : tr(lang, "vebus.unknown")]; }
      if (x.k === "al") { const d = AL_D[x.p.id]; return [tr(lang, x.p.w ? "al.w" : "al.a", { n: tr(lang, "an." + x.p.id) }), tr(lang, d ? d[x.p.w ? 0 : 1] : "ad." + x.p.id)]; }
      return [tr(lang, x.k + ".t"), tr(lang, x.k + ".d")];
    };
    const top = txt(items[0])[0], ti = r.querySelector('[data-k="title"]'), stl = r.querySelector('[data-k="st"]'), tt = r.querySelector('[data-k="tt"]');
    if (ti) ti.textContent = this._cfg.title;
    r.querySelector("svg").setAttribute("aria-label", tr(lang, "aria") + ": " + top); if (tt) tt.textContent = top;
    if (stl) stl.innerHTML = items.map((x) => { const [t, d] = txt(x); return `<div class="lr"><i style="background:${SEVC[x.sev]}"></i><div><b>${t}</b>${d ? `<span>${d}</span>` : ""}</div></div>`; }).join("");
  }
}
customElements.define("victron-multiplus-card", VictronMultiplusCard);

// ------------------------------------------------------------------ visual editor
// best-effort auto detection: every word group must appear in the entity id + friendly name; the Victron MQTT integration names the LEDs "Leds Mains", "Leds Bulk", ...
const LEDW = ["leds", "led_", " led"];
const DETECT = {   // word groups (every group must match) + the option an enum sensor must offer (Victron MQTT: LedState has "blinking", alarms have "no_alarm")
  ledMains: { g: [LEDW, ["mains"]], o: "blinking" }, ledBulk: { g: [LEDW, ["bulk"]], o: "blinking" }, ledAbs: { g: [LEDW, ["absorption"]], o: "blinking" }, ledFloat: { g: [LEDW, ["float"]], o: "blinking" },
  ledInv: { g: [LEDW, ["inverter"]], o: "blinking" }, ledOver: { g: [LEDW, ["overload"]], o: "blinking" }, ledLow: { g: [LEDW, ["low_battery", "low battery", "lowbattery"]], o: "blinking" }, ledTemp: { g: [LEDW, ["temperature"]], o: "blinking" },
  vebusErr: { g: [["vebus_error", "vebuserror", "vebus error"]] },
  alGrid: { g: [["alarm"], ["grid_lost", "grid lost"]], o: "no_alarm" }, alDcI: { g: [["alarm"], ["high_dc_current", "high dc current"]], o: "no_alarm" }, alDcV: { g: [["alarm"], ["high_dc_voltage", "high dc voltage"]], o: "no_alarm" },
  alHiT: { g: [["alarm"], ["high_temperature", "high temperature"]], o: "no_alarm" }, alLow: { g: [["alarm"], ["low_battery", "low battery"]], o: "no_alarm" }, alOver: { g: [["alarm"], ["overload"]], o: "no_alarm" },
  alPhase: { g: [["alarm"], ["phase_rotation", "phase rotation"]], o: "no_alarm" }, alRipple: { g: [["alarm"], ["ripple"]], o: "no_alarm" }, alTsens: { g: [["alarm"], ["temperature_sensor", "temperature sensor"]], o: "no_alarm" }, alVsens: { g: [["alarm"], ["voltage_sensor", "voltage sensor"]], o: "no_alarm" },
};
const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const common = (a, b) => { let n = 0; while (n < a.length && a[n] === b[n]) n++; return n; };
function detect(states, key, anchor) {   // anchor: an entity already found for this unit, entities of the same device (same id prefix) win ties
  const { g, o } = DETECT[key]; let best = "", bs = -1;
  for (const id of Object.keys(states)) {
    if (!/^(sensor|number|input_number|binary_sensor|select)\./.test(id)) continue;
    const st = states[id], opts = st.attributes && st.attributes.options, text = plain(id + " " + (st.attributes && st.attributes.friendly_name)); let hit = 0;
    if (o && Array.isArray(opts) && !opts.includes(o)) continue;   // an enum sensor of another kind
    if (!g.every((w) => { const n = w.filter((x) => text.includes(x)).length; hit += n; return n > 0; })) continue;
    const sc = hit * 10 + (anchor ? common(id, anchor) / 5 : 0) - id.length / 100; if (sc > bs) { bs = sc; best = id; }
  }
  return best;
}
const EDOC = ":host{display:block}.row{margin:8px 0}.btn{cursor:pointer;background:var(--primary-color,#03a9f4);color:#fff;border:0;border-radius:8px;padding:9px 14px;font-size:13px}.hint{font-size:12px;color:var(--secondary-text-color);margin:8px 0}label{display:block;font-size:12px;color:var(--secondary-text-color);margin-top:8px}input{width:100%;box-sizing:border-box;padding:9px;border-radius:8px;border:1px solid var(--divider-color,#555);background:var(--card-background-color,#222);color:var(--primary-text-color,#fff);font-size:14px}";
class VictronMultiplusCardEditor extends HTMLElement {
  setConfig(c) {
    const sig = JSON.stringify(c); if (sig === this._sig && this._config) return;   // HA echoes our own change back: keep the DOM (and the focus)
    this._sig = sig; this._config = { ...c }; this._ent = { ...DEF, ...normEnt(c.entities) }; this._render();
  }
  set hass(h) { const first = !this._hass; this._hass = h; if (this._form) { if (!this._fh || Date.now() - this._fh > 120000) { this._fh = Date.now(); this._form.hass = h; } } else if (first && !this._rendering) this._render(); }
  _lang() { return langOf(this._hass, this._config); }
  _emit() {
    const out = { ...this._config }, ent = {}; KEYS.forEach((k) => { if (this._ent[k]) ent[NAMES[k]] = this._ent[k]; });
    if (Object.keys(ent).length) out.entities = ent; else delete out.entities;
    Object.keys(out).forEach((k) => { if (out[k] === undefined) delete out[k]; });
    this._sig = JSON.stringify(out); this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: out }, bubbles: true, composed: true }));
  }
  _data() { const c = this._config; return { title: c.title ?? "", language: c.language ?? "auto", layout: c.layout ?? "full", led_blink: c.led_blink ?? BLINK, inverter_model: c.inverter_model ?? "MultiPlus-II", inverter_type: c.inverter_type ?? (c.inverter_specs ? "" : DEF_TYPE), ac_voltage: c.ac_voltage ?? 230, inverter_specs: c.inverter_specs ?? "", inverter_note: c.inverter_note ?? "", ...Object.fromEntries(KEYS.map((k) => ["e_" + k, this._ent[k] || ""])) }; }
  _detect() { if (!this._hass) return; let n = 0, anchor = this._hass.states[this._ent.ledMains] ? this._ent.ledMains : ""; KEYS.forEach((k) => { if (!this._hass.states[this._ent[k]]) { const f = detect(this._hass.states, k, anchor); if (f) { this._ent[k] = f; n++; if (!anchor && k.startsWith("led")) anchor = f; } } }); this._emit(); this._render(n); }
  async _render(found) {
    if (!this._config) return; const L = this._lang(), t = (k, p) => tr(L, k, p);
    this._rendering = true; const root = this.shadowRoot || this.attachShadow({ mode: "open" }), tok = (this._tok = (this._tok || 0) + 1);
    const msg = found === undefined ? t("ed.hint") : found ? t("ed.found", { n: found }) : t("ed.none");
    root.innerHTML = `<style>${EDOC}</style><div class="row"><button class="btn" id="det">${t("ed.detect")}</button></div><div class="hint">${msg}</div><div id="form"></div>`;
    root.querySelector("#det").onclick = () => this._detect();
    try { if (!customElements.get("ha-form") && window.loadCardHelpers) { const h = await window.loadCardHelpers(); await h.createCardElement({ type: "entities", entities: [] }); } } catch (e) {}
    if (tok !== this._tok) return; this._rendering = false;
    const slot = root.querySelector("#form"), label = { title: t("ed.title"), language: t("ed.language"), layout: t("ed.layout"), led_blink: t("ed.blink"), inverter_model: t("ed.model"), inverter_type: t("ed.type"), ac_voltage: t("ed.acv"), inverter_specs: t("ed.specs"), inverter_note: t("ed.note"), ...Object.fromEntries(KEYS.map((k) => ["e_" + k, t("e." + k)])) };
    const apply = (d) => {
      const c = this._config; c.title = d.title || undefined; c.language = d.language && d.language !== "auto" ? d.language : undefined; c.layout = d.layout === "leds" ? "leds" : undefined; c.led_blink = +d.led_blink > 0 && +d.led_blink !== BLINK ? +d.led_blink : undefined;
      c.inverter_model = d.inverter_model && d.inverter_model !== "MultiPlus-II" ? d.inverter_model : undefined; c.inverter_type = d.inverter_type || undefined; c.ac_voltage = +d.ac_voltage > 0 && +d.ac_voltage !== 230 ? +d.ac_voltage : undefined; c.inverter_specs = d.inverter_specs || undefined; c.inverter_note = d.inverter_note || undefined; KEYS.forEach((k) => { this._ent[k] = d["e_" + k] || ""; });
      this._emit();
    };
    if (customElements.get("ha-form")) {
      const form = document.createElement("ha-form"); this._form = form;
      form.schema = [{ name: "title", selector: { text: {} } }, { name: "language", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: t("ed.auto") }, ...Object.keys(I18N).map((l) => ({ value: l, label: l.toUpperCase() }))] } } },
        { name: "layout", selector: { select: { mode: "dropdown", options: [{ value: "full", label: t("ed.l.full") }, { value: "leds", label: t("ed.l.leds") }] } } },
        { name: "led_blink", selector: { number: { min: 0.1, max: 10, step: 0.05, mode: "box", unit_of_measurement: "s" } } }, { name: "inverter_model", selector: { text: {} } }, { name: "inverter_type", selector: { text: {} } }, { name: "ac_voltage", selector: { number: { min: 100, max: 260, step: 1, mode: "box", unit_of_measurement: "V" } } }, { name: "inverter_specs", selector: { text: {} } }, { name: "inverter_note", selector: { text: {} } },
        { type: "expandable", title: t("ed.entities"), expanded: true, schema: KEYS.filter((k) => !ALARMS.some((a) => a[1] === k)).map((k) => ({ name: "e_" + k, selector: { entity: {} } })) },
        { type: "expandable", title: t("ed.alarms"), schema: ALARMS.map((a) => ({ name: "e_" + a[1], selector: { entity: {} } })) }];
      form.data = this._data(); form.hass = this._hass; this._fh = Date.now(); form.computeLabel = (sc) => label[sc.name] || sc.name;
      form.addEventListener("value-changed", (e) => { e.stopPropagation(); form.data = e.detail.value; apply(e.detail.value); });
      slot.appendChild(form);
    } else {   // fallback without ha-form: plain inputs with suggestions
      this._form = null; const ids = this._hass ? Object.keys(this._hass.states).filter((x) => /^(sensor|number|input_number|binary_sensor|select)\./.test(x)).sort() : [], d = this._data();
      slot.innerHTML = `<datalist id="dl">${ids.map((x) => `<option value="${x}">`).join("")}</datalist>` + Object.keys(label).map((k) => `<label>${label[k]}</label><input data-f="${k}" ${k.startsWith("e_") ? 'list="dl"' : ""}>`).join("");
      slot.querySelectorAll("[data-f]").forEach((i) => { i.value = d[i.dataset.f]; i.onchange = () => { const nd = this._data(); nd[i.dataset.f] = i.value.trim(); apply(nd); }; });
    }
  }
}
customElements.define("victron-multiplus-card-editor", VictronMultiplusCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({ type: "victron-multiplus-card", name: "Victron MultiPlus", description: "Front panel of a Victron MultiPlus-II with its LEDs, VE.Bus error code and a plain-language status", preview: false });
console.info(`%c VICTRON-MULTIPLUS %c v${VERSION} `, "background:#2c74d6;color:#fff", "background:#111;color:#2c74d6");

/* Alegreya Sans (Juan Pablo del Peral / Huerta Tipográfica, SIL Open Font License 1.1) subset: latin + ă ș ț, weights 500 / 700; its default figures are old-style, like the print on the Victron unit.
 * Used for the printed text of the Victron panel. Loaded with the FontFace API into document.fonts because @font-face does not work inside a shadow root. */
(() => {
  try {
    if (!window.FontFace || !document.fonts || window.__vmpFont) return; window.__vmpFont = 1;
    const L = "U+0020-007E,U+00A0,U+00B7,U+00C2,U+00CE,U+00E2,U+00EE,U+2013-2014,U+2018-201E,U+2022,U+2026", X = "U+0102-0103,U+0218-021B";
    [["500", L, "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"], ["700", L, "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"], ["500", X, "d09GMgABAAAAAATYAA4AAAAACKwAAASHAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGigbIBwwBmAASBEICocchXoBNgIkAzwLIgAEIAWDfgcgG/UGUZRQTgbFz4RMZXBjWYkwIzJmUWs1L9SWjZJFVguu/ej0fQn+nx9z577/JoaYR5VkdZm8GvHQxCJpnTWSWMTT/s/nWS+tk9Yj/BGdgZyu7ONA3mJ1gkg8/cX2/TmF+3w3J6dx00wacBRFFGkQaq9iACcupz+WTVyj0gAjTnBO7DpPw6JsTE4skDnosWH7fPFjmgXq+d7o+ynFGDnj3qabyX0ZAnkAICZHSMcKZHUxgO1HLAkcDogFAKRNsUe3Tu2+sqkGDB6FVB0YGEC2+yjoG5iwt2UAdh8FurKOGpFJnXn8kFsXhAyIZp0BxXkTXpZ5AAH0G5uAPhxgIIAmdAJNGKYBSU4swTpjhIa1xctJ0u6c5rKS8qdXqxZAHQD6ADnwAZoARcA0AMBa2soFSrTkCgTTRmCBW+qK+CIhnsYAeSc8n8jMwjNS36SSareU+K4FOBs1qVBAuRzfpfRO1+xVELvvYhvnoqeUSmyjSkVUk2m6JJ6uzpMa6fwXChOkHB4ldluooxuu1/p08IXItDQ93WRjH75L7quRpiIyrpwAgd7tKekvoki1OXxXB+z06pwc/C6Y1sCbQL/S5d01NbQj8cRHHU24ji1h6Wm4hgmBpauThDrCyTM3ibwLAWVjB+LsrIl5Q0IOSWuNeWyjNdbtkXfmDWBAnJz8a0zrEp5VggjdjO20VTT9FGFs+dONKw33ZFuwKyxKMMjdEWMoyv32fdM2dDpqanLmUWawlUOoo6tnWplzsG2u+hFe6WhwhrG5q9LcvO9RZJClfYijq0dqsWMgPFrBjGtmujPKGJMVzAFGvbuMWcGO6wGKhCAfCbOUWSyWzolwl23HB6WP0wLYZqGhEB/mm1mgftaYaRZmYhxisIHihaf75EQbSz+rGWB6DrG0WODLt/EThpydDRw0tfdeLOAbmZlbBMdZeISFGxDktYkwPX1UpKW95nKBvom5X2ZcPOCxQcfOVz65v86XHgFDAW7RflGZRtuxog3uURsZv/0OgrltLCzA0yMoYOyy8ATX1JR7QggusVYhBWEPWZq2ei0cdTZ4r/sX7uzsHOr0/4Dwtr6JCb9bKDQwAAMptflwZgAdBDXZAwxgSnAJZrOFnMa4Cx6NEfl914CJD8jB1pDKvNKt7aSx0sPYxHD/dW236axUzL2mSkvmDgYsyR/Hu3K+cPknnQpvgErj/gRQmeh8/o////ET5wApBkAIr6oc/iWiS10QLq6xDzsRk8ujEfaDRlZpmF1Bl4mg5gCqZ439EIE6WdhKmA4Rr2BqFp2WDFAGwZAxU4ap8WkEy4FKB42EzSzfJ2kk64So12ClJpXKVaAgzhw5cYGQKpRCgtQoVa6JdlypEJKiUJ1mSKIm9aqUKkYxlMpQKtRrgiKWpzdRGjTz5sBBuUqaLFPEXrF6tRzETaWaUApRKjWo97W6UJlKxQo5hMHtGrcKOjlOqRKVZGolo78tU6NQE2f2HDly5SMSCUF8Dvq7qx2Q5rm0d6V6dVCJoMuzZQr/JFlvaJXqUP2xjBN77qzcMnTsLt5YAw=="], ["700", X, "d09GMgABAAAAAATUAA4AAAAACMAAAASBAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGigbIBwwBmAASBEICocohX8BNgIkAzwLIgAEIAWEBgcgGwIHUZRPTpji54ENrlFWN6miCAkbaTy3kV7kRPPXt9+zvgieaoz9273DXat4JmtiiFZpJBKV6QxZusk3adzw72mvUFJ6mdMOUjowSwZlAroDiM/d1/H8v7f7/klxGHQ8GCVpglFEmYbQloBALBPX1EXZFy0LhzzxbpCfVVhh8sR23onJFTgdTmcDs9kurPdrCxHzwskvb/oyBPgDAKH8CGhXAb7iJZK1MxkHXBbgHAAgfr5C5n3ys6e1Hhgvqr0RGBNYJtuK1gse0Kc6gL4lSA7MiTLAW6k/P1P3jiCcpDTOJLtql3ZRAgEByKe7IJk3UGBAOEOGtFUOPEcJjdE45yCl0RQBCM+8rDfLlyd/tSDYIC4EY/dk4Ae+gDRgHKAcAOh05JUSgEKe5gwwyyw0QSatWCgWQYQ3gXviUDGckwflZP/Nxh3OvICs53Dfcvv5DZ4987USpOr8c3j2IW3kQeKdF7cy8vKlXx1OpBIhMg/ClaTgJ+6Hr9qE5U8rlQLf5bvjQiL0CLO9PU0gaSOQ9Vmgkjj7Es5Ztgq7/WYjyJ8WXL7nDmTdhdMVx29f/hC7G7OXe6byzJ0rDeGvIQr8VuwLGklA0wXTyEgFayCED+/2K9qU83thFwGvv381emgDPwOeJYcrH2qQWXU2oOgQwvH2gFfffry7OhizirLgAXojnSnOm3w9tlmtSTCPhLNpoHE2HVG0B6gwnRH9rzckWKtjzZ5xPgEheQ2+WHExKh342Vrk4OgKGZGEvWSMySPOO1D+QJ1PHPjVzSnvZqHMFNbdafZFZi7ay7Jyy2+DXxOx4VJWMRyskKwTQHMr4bh/Y0/aSzjy2ASQYYn0RoNW6U1RkTaxuv3LA8k9lN4r0mbui0x7TuO8n2YB+lcnJNS/K0uV6lNShWVoKCzWGUVjs8xhWLJBWHXzd5/RoHsjk9ccCY1Do6hMHKgpZDc/1RQ3KehkZoK94fFsLCSl22mKXtflz8K6WB+RXj1wWfArOSY8FIt7wZdec3JwcDomBc7x7qhvUmUGl+duc4PX9Q40KU3xC/RP9qP/kd1OcbB3vSNTDVIJ8BKUH84jrJE2AjMHIHrg1/FeSEDO9D4Dn6/34+WbAbkv4A3dTAU244c80n1BS/Pfuitx/pdbeiHCfOXyGn/eFNMoaEDjedAkr8VBoX+9OeYV4DbspIbQ3LjNz9YE1b6yaRivgQAE5h7XsD9CcWFlEJ4c6Bja4So9vyQh/wUhdyQimyLgUfgS+Dx1HR9CQLAZHEtYBXrbX/dZDLL4AFcQCEWsK6Hy9ig0qn0RWulJF3poDba6p9TsadOkWY9WNapUa4coVaxEmfjGVasQsEU9qkorke5BQYyNb9QGMaxVk1oVyna0a9GhXbUmrZA2e/e4ds3aBCtSZEmNte9Qyt2cJg08wsQKrdpR2tnbrKn23ZRKNcpQPI4hu+VqOvS3ozWpV85boWLFytXphkMkq0srxODG2XegAL2Eil9XrtGkEVKoTW7BW4nqR91082s0aq/uBi+FKuUcY2VweW6eGQAA"]].forEach(([w, r, d]) => { const f = new FontFace("VMP Sans", `url(data:font/woff2;base64,${d})`, { weight: w, unicodeRange: r }); f.load().then(() => document.fonts.add(f)).catch(() => {}); });
  } catch (e) {}
})();
})();
