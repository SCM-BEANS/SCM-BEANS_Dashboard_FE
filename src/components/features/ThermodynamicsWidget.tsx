"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";

export const ThermodynamicsWidget = () => {
  const { thermodynamics, setThermodynamicsTarget } = useIoTStore();
  const { t } = useI18nStore();

  return (
    <section className="flex flex-col gap-4">
      <div className="text-xl font-bold uppercase border-b-2 border-outline pb-2 text-primary">{t("thermodynamics")}</div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-outline border border-outline rounded-md shadow-sm overflow-hidden">
        
        {/* Boiler 1 */}
        <div className="p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors flex flex-col justify-between">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("boiler_1_temp")}</div>
          <div className="flex items-baseline text-primary">
            <span className="text-3xl font-semibold">{thermodynamics.boiler1Temp}°C</span>
            <span className="text-xl mx-1 text-on-surface-variant/50">/</span>
            <input 
              type="number" 
              value={thermodynamics.boiler1Target}
              onChange={(e) => setThermodynamicsTarget('boiler1Target', Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-primary outline-none w-10 md:w-12 text-on-surface-variant hover:text-primary focus:text-primary transition-colors p-0 text-center"
            />
            <span className="text-xl font-semibold text-on-surface-variant">°C</span>
          </div>
        </div>

        {/* Boiler 2 */}
        <div className="p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors flex flex-col justify-between">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("boiler_2_temp")}</div>
          <div className="flex items-baseline text-primary">
            <span className="text-3xl font-semibold">{thermodynamics.boiler2Temp}°C</span>
            <span className="text-xl mx-1 text-on-surface-variant/50">/</span>
            <input 
              type="number" 
              value={thermodynamics.boiler2Target}
              onChange={(e) => setThermodynamicsTarget('boiler2Target', Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-primary outline-none w-10 md:w-12 text-on-surface-variant hover:text-primary focus:text-primary transition-colors p-0 text-center"
            />
            <span className="text-xl font-semibold text-on-surface-variant">°C</span>
          </div>
        </div>

        {/* Output Temp */}
        <div className="p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors flex flex-col justify-between">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("output_temp")}</div>
          <div className="flex items-baseline text-primary">
            <span className="text-3xl font-semibold">{thermodynamics.outputTemp}°C</span>
            <span className="text-xl mx-1 text-on-surface-variant/50">/</span>
            <input 
              type="number" 
              value={thermodynamics.outputTarget}
              onChange={(e) => setThermodynamicsTarget('outputTarget', Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-primary outline-none w-10 md:w-12 text-on-surface-variant hover:text-primary focus:text-primary transition-colors p-0 text-center"
            />
            <span className="text-xl font-semibold text-on-surface-variant">°C</span>
          </div>
        </div>

        {/* Brew Pressure */}
        <div className="p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors flex flex-col justify-between">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("brew_pressure")}</div>
          <div className="flex items-baseline text-primary">
            <span className="text-3xl font-semibold">{thermodynamics.brewPressure}</span>
            <span className="text-xl mx-1 text-on-surface-variant/50">/</span>
            <input 
              type="number" 
              step="0.1"
              value={thermodynamics.brewPressureTarget}
              onChange={(e) => setThermodynamicsTarget('brewPressureTarget', Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-primary outline-none w-10 md:w-12 text-on-surface-variant hover:text-primary focus:text-primary transition-colors p-0 text-center"
            />
            <span className="text-xl font-semibold text-on-surface-variant ml-1">Bar</span>
          </div>
        </div>

        {/* Milk Ch 1 */}
        <div className="p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors flex flex-col justify-between">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("milk_ch_1")}</div>
          <div className="flex items-baseline text-secondary">
            <span className="text-3xl font-semibold">{thermodynamics.milkCh1Temp}°C</span>
            <span className="text-xl mx-1 text-on-surface-variant/50">/</span>
            <input 
              type="number" 
              value={thermodynamics.milkCh1Target}
              onChange={(e) => setThermodynamicsTarget('milkCh1Target', Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-secondary outline-none w-10 md:w-12 text-on-surface-variant hover:text-secondary focus:text-secondary transition-colors p-0 text-center"
            />
            <span className="text-xl font-semibold text-on-surface-variant">°C</span>
          </div>
        </div>

        {/* Milk Ch 2 */}
        <div className="p-4 bg-surface-container-lowest hover:bg-surface-container transition-colors flex flex-col justify-between">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("milk_ch_2")}</div>
          <div className="flex items-baseline text-secondary">
            <span className="text-3xl font-semibold">{thermodynamics.milkCh2Temp}°C</span>
            <span className="text-xl mx-1 text-on-surface-variant/50">/</span>
            <input 
              type="number" 
              value={thermodynamics.milkCh2Target}
              onChange={(e) => setThermodynamicsTarget('milkCh2Target', Number(e.target.value))}
              className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-secondary outline-none w-10 md:w-12 text-on-surface-variant hover:text-secondary focus:text-secondary transition-colors p-0 text-center"
            />
            <span className="text-xl font-semibold text-on-surface-variant">°C</span>
          </div>
        </div>

      </div>
    </section>
  );
};
