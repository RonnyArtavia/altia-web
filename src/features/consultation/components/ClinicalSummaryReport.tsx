/**
 * ClinicalSummaryReport - Professional Clinical Summary Document
 * Based on medical briefing design, adapts IPS data into formal clinical report
 */

import React from 'react';
import type { IPSDisplayData, VitalSignsData, PatientRecordDisplay } from '../types/medical-notes';

interface ClinicalSummaryReportProps {
  patientRecord?: PatientRecordDisplay;
  ipsData: IPSDisplayData;
  vitalSigns?: VitalSignsData | null;
}

const Tag = ({ color, children }: { color: string; children: React.ReactNode }) => {
  const colors = {
    red: { bg: "#FED7D7", text: "#9B2C2C" },
    yellow: { bg: "#FEFCBF", text: "#744210" },
    green: { bg: "#C6F6D5", text: "#22543D" },
    gray: { bg: "#EDF2F7", text: "#4A5568" },
  };
  const c = colors[color as keyof typeof colors] || colors.gray;
  return (
    <span style={{
      display: "inline-block",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 4,
      marginLeft: 6,
      background: c.bg,
      color: c.text,
      verticalAlign: "middle",
    }}>{children}</span>
  );
};

export function ClinicalSummaryReport({ patientRecord, ipsData, vitalSigns }: ClinicalSummaryReportProps) {
  const patient = patientRecord;
  const abnormalLabs = ipsData.labResults?.filter(r => r.flag && r.flag !== "Normal") || [];
  const normalLabs = ipsData.labResults?.filter(r => !r.flag || r.flag === "Normal") || [];

  // Filter out empty or placeholder conditions
  const validConditions = ipsData.conditions?.filter(dx =>
    dx.name &&
    dx.name !== "Condición no especificada" &&
    dx.name.trim() !== "" &&
    !dx.name.toLowerCase().includes("no especificad")
  ) || [];

  // Función para generar resumen narrativo automático
  const generateClinicalNarrative = (): string => {
    const parts: string[] = [];

    // Datos demográficos básicos
    const demographics = `Paciente ${patient?.gender?.toLowerCase() || 'no especificado'} de ${patient?.age || 'edad no disponible'} años`;
    parts.push(demographics);

    // Diagnósticos principales
    if (validConditions.length > 0) {
      const activeConditions = validConditions.filter(c =>
        c.status?.toLowerCase().includes('activ') || !c.status?.toLowerCase().includes('resuel')
      );
      if (activeConditions.length > 0) {
        const conditionsList = activeConditions.slice(0, 3).map(c => c.name).join(', ');
        const moreConditions = activeConditions.length > 3 ? ` y ${activeConditions.length - 3} diagnóstico${activeConditions.length - 3 > 1 ? 's' : ''} adicional${activeConditions.length - 3 > 1 ? 'es' : ''}` : '';
        parts.push(`con ${conditionsList}${moreConditions}`);
      }
    } else {
      parts.push('sin diagnósticos activos documentados');
    }

    // Alergias
    if (ipsData.allergies && ipsData.allergies.length > 0) {
      const allergiesList = ipsData.allergies.map(a => a.name).join(', ');
      parts.push(`Alergias conocidas: ${allergiesList}`);
    } else {
      parts.push('Sin alergias conocidas documentadas');
    }

    // Medicamentos por categoría
    if (ipsData.medications && ipsData.medications.length > 0) {
      parts.push(`Tratamiento activo con ${ipsData.medications.length} medicamento${ipsData.medications.length > 1 ? 's' : ''}`);
    } else {
      parts.push('Sin medicamentos activos registrados');
    }

    // Laboratorio anormal
    if (abnormalLabs.length > 0) {
      const mostRecentDate = abnormalLabs[0]?.date || 'fecha no disponible';
      parts.push(`Se identificaron ${abnormalLabs.length} valor${abnormalLabs.length > 1 ? 'es' : ''} de laboratorio fuera de rango en resultados recientes`);
    }

    return parts.join('. ') + '.';
  };

  // Función para determinar estado de sección (confirmado vs no documentado)
  const getSectionStatus = (hasData: boolean, isRequired: boolean) => {
    if (hasData) return 'has_data';
    return isRequired ? 'not_documented' : 'confirmed_empty';
  };

  const s = {
    p: { margin: "0 0 14px", color: "#333", lineHeight: 1.75 },
    h1: { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#111" },
    h2: { fontSize: 19, fontWeight: 700, margin: "32px 0 12px", color: "#111" },
    h3: { fontSize: 16, fontWeight: 700, margin: "24px 0 8px", color: "#333" },
    hr: { border: "none", borderTop: "2px solid #e8e8e8", margin: "24px 0" },
    th: {
      textAlign: "left" as const, padding: "10px 14px", borderBottom: "2px solid #e2e2e2",
      fontWeight: 600, fontSize: 13, color: "#555",
      fontFamily: "'DM Sans', sans-serif", background: "#fafafa",
    },
    td: { padding: "9px 14px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" as const, color: "#333" },
    table: { width: "100%", borderCollapse: "collapse" as const, margin: "12px 0 20px", fontSize: 14 },
    bullet: { margin: "0 0 7px", paddingLeft: 4, color: "#333", fontSize: 14 },
    narrative: {
      fontSize: 16,
      lineHeight: 1.6,
      color: "#2d3748",
      fontWeight: 500,
      margin: "0 0 24px",
      padding: "16px 20px",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderLeft: "4px solid #4299e1",
      borderRadius: "4px"
    }
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="w-full" style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontSize: 15,
        lineHeight: 1.7,
        color: "#1a1a1a",
        padding: "16px 20px 40px",
      }}>


        {/* Alergias */}
        <h2 style={s.h2}>Alergias y Reacciones Adversas</h2>
        {ipsData.allergies && ipsData.allergies.length > 0 ? (
          <>
            <p style={s.p}>
              El paciente presenta las siguientes alergias conocidas:
            </p>
            {ipsData.allergies.map((allergy, index) => (
              <div key={index} style={s.bullet}>
                <strong>{allergy.name}</strong>
                {allergy.severity && ` - Severidad: ${allergy.severity}`}
                {allergy.date && ` (Registrada: ${allergy.date})`}
                {allergy.notes && (
                  <div style={{ fontSize: 13, color: "#666", fontStyle: 'italic', marginTop: 4 }}>
                    {allergy.notes}
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <p style={s.p}>No hay alergias conocidas documentadas en el expediente médico.</p>
        )}

        <hr style={s.hr} />

        {/* Diagnósticos */}
        <h2 style={s.h2}>Diagnósticos Activos</h2>

        {validConditions.length > 0 ? (
          <>
            <p style={s.p}>
              Los siguientes diagnósticos se encuentran activos en el expediente:
            </p>
            {validConditions.map((dx, i) => (
              <div key={i} style={s.bullet}>
                <strong>{dx.name}</strong>
                <Tag color={dx.status?.toLowerCase().includes('activ') ? "green" : "gray"}>
                  {dx.status || 'Estado no especificado'}
                </Tag>
                {dx.date && <span style={{ color: "#888", fontSize: 13 }}> (Registrado: {dx.date})</span>}
              </div>
            ))}
          </>
        ) : (
          <p style={s.p}>
            No hay diagnósticos activos registrados en el expediente médico en este momento.
          </p>
        )}

        <hr style={s.hr} />

        {/* Medicamentos */}
        <h2 style={s.h2}>Medicamentos Activos</h2>
        {ipsData.medications && ipsData.medications.length > 0 ? (
          <>
            <p style={s.p}>
              Tratamiento farmacológico actual registrado:
            </p>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Medicamento</th>
                  <th style={s.th}>Posología</th>
                  <th style={s.th}>Inicio</th>
                  <th style={s.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ipsData.medications.map((m, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{m.name}</td>
                    <td style={s.td}>{m.dose || m.frequency || 'Dosis no especificada'}</td>
                    <td style={{ ...s.td, color: "#888", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                      {m.date || 'Fecha no disponible'}
                    </td>
                    <td style={s.td}><Tag color="green">Activo</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p style={s.p}>No hay medicamentos activos registrados en el sistema.</p>
        )}

        <hr style={s.hr} />

        {/* Signos Vitales */}
        <h2 style={s.h2}>Signos Vitales</h2>
        {vitalSigns ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {vitalSigns.bloodPressure && (
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="text-blue-800 font-bold text-sm mb-1">Presión Arterial</div>
                <div className="text-blue-900 font-semibold text-lg">{vitalSigns.bloodPressure}</div>
              </div>
            )}
            {vitalSigns.heartRate && (
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="text-blue-800 font-bold text-sm mb-1">Frecuencia Cardíaca</div>
                <div className="text-blue-900 font-semibold text-lg">{vitalSigns.heartRate} bpm</div>
              </div>
            )}
            {vitalSigns.temperature && (
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="text-blue-800 font-bold text-sm mb-1">Temperatura</div>
                <div className="text-blue-900 font-semibold text-lg">{vitalSigns.temperature}°C</div>
              </div>
            )}
            {vitalSigns.oxygenSaturation && (
              <div className="bg-blue-50 p-4 rounded-lg border">
                <div className="text-blue-800 font-bold text-sm mb-1">Saturación O₂</div>
                <div className="text-blue-900 font-semibold text-lg">{vitalSigns.oxygenSaturation}%</div>
              </div>
            )}
          </div>
        ) : (
          <p style={s.p}>Los signos vitales no han sido registrados para esta consulta.</p>
        )}

        <hr style={s.hr} />

        {/* Resultados de Laboratorio */}
        <h2 style={s.h2}>Resultados de Laboratorio</h2>
        {ipsData.labResults && ipsData.labResults.length > 0 ? (
          <>
            <p style={s.p}>
              Resultados de laboratorio más recientes:
            </p>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Prueba</th>
                  <th style={s.th}>Resultado</th>
                  <th style={s.th}>Rango de Referencia</th>
                  <th style={s.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ipsData.labResults.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight: 500 }}>{r.name}</td>
                    <td style={{
                      ...s.td,
                      fontWeight: 600,
                      color: r.flag && r.flag !== "Normal" ? "#D97706" : "#059669"
                    }}>
                      {r.value} {r.unit || ''}
                    </td>
                    <td style={{ ...s.td, color: "#6B7280", fontSize: 12 }}>{r.referenceRange || 'No disponible'}</td>
                    <td style={s.td}>
                      <Tag color={r.flag && r.flag !== "Normal" ? "yellow" : "green"}>
                        {r.flag || "Normal"}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p style={s.p}>No hay resultados de laboratorio disponibles.</p>
        )}

        <hr style={s.hr} />

        {/* Inmunizaciones */}
        <h2 style={s.h2}>Historial de Vacunación</h2>
        {ipsData.vaccines && ipsData.vaccines.length > 0 ? (
          <>
            <p style={s.p}>
              Registro de inmunizaciones aplicadas:
            </p>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Vacuna</th>
                  <th style={s.th}>Fecha de Aplicación</th>
                  <th style={s.th}>Sitio de Aplicación</th>
                </tr>
              </thead>
              <tbody>
                {ipsData.vaccines.map((v, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight: 500 }}>{v.name}</td>
                    <td style={{ ...s.td, color: "#6B7280", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                      {v.date || 'Fecha no disponible'}
                    </td>
                    <td style={{ ...s.td, color: "#6B7280", fontSize: 13 }}>
                      {v.site || 'No especificado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p style={s.p}>No hay registro de inmunizaciones en el expediente.</p>
        )}

        <hr style={s.hr} />

        {/* Órdenes Médicas */}
        {ipsData.labOrders && ipsData.labOrders.length > 0 && (
          <>
            <h2 style={s.h2}>Órdenes Médicas Pendientes</h2>
            <p style={s.p}>
              Las siguientes órdenes médicas están pendientes de ejecución:
            </p>
            {ipsData.labOrders.map((o, i) => (
              <div key={i} style={s.bullet}>
                <strong>{o.name}</strong>
                {o.date && ` - Solicitada: ${o.date}`}
                {o.status && ` • Estado: ${o.status}`}
              </div>
            ))}
            <hr style={s.hr} />
          </>
        )}

        {/* Historial de Consultas */}
        {ipsData.encounters && ipsData.encounters.length > 0 && (
          <>
            <h2 style={s.h2}>Historial de Consultas</h2>
            <p style={s.p}>
              Últimas consultas y procedimientos registrados:
            </p>
            {ipsData.encounters.slice(0, 5).map((encounter, i) => (
              <div key={i} style={{
                ...s.bullet,
                background: "#f8f9fa",
                border: "1px solid #e9ecef",
                borderRadius: 6,
                padding: "12px 16px",
                margin: "0 0 12px"
              }}>
                <div style={{ fontWeight: 600, color: "#495057", marginBottom: 4 }}>
                  {encounter.type || 'Consulta/Procedimiento'}
                  <span style={{ float: 'right', color: "#6c757d", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                    {encounter.date}
                  </span>
                </div>
                {encounter.doctor && (
                  <div style={{ color: "#6c757d", fontSize: 13, marginBottom: 4 }}>
                    <strong>Profesional:</strong> {encounter.doctor}
                  </div>
                )}
                {encounter.summary && (
                  <div style={{ color: "#495057", fontSize: 13, fontStyle: 'italic' }}>
                    {encounter.summary}
                  </div>
                )}
              </div>
            ))}
            <hr style={s.hr} />
          </>
        )}

      </div>
    </div>
  );
}