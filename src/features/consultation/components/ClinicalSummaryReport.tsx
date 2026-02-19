/**
 * ClinicalSummaryReport - Professional Clinical Summary Document
 * Based on medical briefing design, adapts IPS data into formal clinical report
 */

import React, { useState } from 'react';
import type { IPSDisplayData, VitalSignsData, PatientRecordDisplay, ConsultationEntry } from '../types/medical-notes';

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

// Modal para mostrar detalles completos de la consulta
const ConsultationModal = ({
  consultation,
  isOpen,
  onClose
}: {
  consultation: ConsultationEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !consultation) return null;

  // Simular datos SOAP basados en la consulta
  const mockSoapData = {
    subjective: consultation.patientNote || 'Paciente refiere los síntomas descritos en el resumen de la consulta.',
    objective: 'Examen físico realizado según protocolo médico estándar.',
    assessment: consultation.summary || 'Evaluación médica completada.',
    plan: 'Plan de tratamiento establecido según guías clínicas apropiadas.'
  };

  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid #e5e7eb'
    },
    header: {
      padding: '20px 24px',
      borderBottom: '2px solid #e5e7eb',
      backgroundColor: '#f8fafc'
    },
    content: {
      padding: '24px',
      fontFamily: "'Source Serif 4', Georgia, serif",
      fontSize: 15,
      lineHeight: 1.6,
      color: '#1a1a1a'
    },
    closeButton: {
      position: 'absolute' as const,
      top: '16px',
      right: '20px',
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '4px',
      borderRadius: '4px'
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: '12px',
      color: '#374151',
      borderLeft: '3px solid #6366f1',
      paddingLeft: '12px'
    },
    soapSection: {
      backgroundColor: '#fefefe',
      border: '1px solid #e8e8e8',
      borderRadius: '3px',
      padding: '12px 16px',
      margin: '0 0 8px',
      minHeight: '60px'
    },
    soapLabel: {
      display: 'inline-block',
      width: '24px',
      height: '24px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 'bold',
      textAlign: 'center' as const,
      lineHeight: '24px',
      marginRight: '12px',
      color: '#ffffff'
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <button style={modalStyles.closeButton} onClick={onClose}>×</button>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1f2937' }}>
            📋 Detalle de Consulta Médica
          </h2>
          <div style={{ marginTop: '8px', fontSize: 14, color: '#6b7280' }}>
            <strong>{consultation.type}</strong> • {consultation.date} • {consultation.doctor}
          </div>
        </div>

        <div style={modalStyles.content}>
          {/* Nota Clínica SOAP */}
          <div style={{ marginBottom: '32px' }}>
            <div style={modalStyles.sectionHeader}>📋 Nota Clínica SOAP</div>

            <div style={modalStyles.soapSection}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ ...modalStyles.soapLabel, backgroundColor: '#3b82f6' }}>S</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Subjetivo</div>
                  <div style={{ color: '#4b5563', fontSize: 14 }}>{mockSoapData.subjective}</div>
                </div>
              </div>
            </div>

            <div style={modalStyles.soapSection}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ ...modalStyles.soapLabel, backgroundColor: '#10b981' }}>O</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Objetivo</div>
                  <div style={{ color: '#4b5563', fontSize: 14 }}>{mockSoapData.objective}</div>
                </div>
              </div>
            </div>

            <div style={modalStyles.soapSection}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ ...modalStyles.soapLabel, backgroundColor: '#f59e0b' }}>A</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Evaluación</div>
                  <div style={{ color: '#4b5563', fontSize: 14 }}>{mockSoapData.assessment}</div>
                </div>
              </div>
            </div>

            <div style={modalStyles.soapSection}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ ...modalStyles.soapLabel, backgroundColor: '#8b5cf6' }}>P</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#374151' }}>Plan</div>
                  <div style={{ color: '#4b5563', fontSize: 14 }}>{mockSoapData.plan}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de la Consulta */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ ...modalStyles.sectionHeader, borderLeftColor: '#0891b2' }}>📊 Resumen de la Consulta</div>
            <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
              {consultation.summary}
            </div>
          </div>

          {/* Educación y Recomendaciones */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ ...modalStyles.sectionHeader, borderLeftColor: '#0ea5e9' }}>💡 Educación y Recomendaciones</div>
            <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
              • Seguir las indicaciones médicas establecidas durante la consulta<br/>
              • Mantener hábitos de vida saludables<br/>
              • Acudir a consulta de seguimiento según programación<br/>
              • Contactar al médico tratante ante cualquier inquietud o complicación
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ClinicalSummaryReport({ patientRecord, ipsData, vitalSigns }: ClinicalSummaryReportProps) {
  // Estados para el modal y la vista de consultas
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAllConsultations, setShowAllConsultations] = useState(false);

  // Funciones del modal
  const openConsultationModal = (consultation: ConsultationEntry) => {
    setSelectedConsultation(consultation);
    setShowModal(true);
  };

  const closeConsultationModal = () => {
    setShowModal(false);
    setSelectedConsultation(null);
  };

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
        <div style={{
          borderLeft: "3px solid #ea580c",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <h2 style={{ ...s.h2, color: "#ea580c", marginBottom: "12px" }}>
            ⚠️ Alergias y Reacciones Adversas
          </h2>
          {ipsData.allergies && ipsData.allergies.length > 0 ? (
            <>
              <p style={s.p}>
                El paciente presenta las siguientes alergias conocidas:
              </p>
              {ipsData.allergies.map((allergy, index) => (
                <div key={index} style={s.bullet}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <strong>{allergy.name}</strong>
                    {allergy.severity && (
                      <span style={{
                        background: allergy.severity.toLowerCase().includes('alta') ? "#fee2e2" : "#fef3c7",
                        color: allergy.severity.toLowerCase().includes('alta') ? "#dc2626" : "#d97706",
                        padding: "1px 6px",
                        borderRadius: "8px",
                        fontSize: "10px",
                        fontWeight: "600"
                      }}>
                        {allergy.severity}
                      </span>
                    )}
                  </div>
                  {allergy.date && (
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      Registrada: {allergy.date}
                    </div>
                  )}
                  {allergy.notes && (
                    <div style={{ fontSize: 13, color: "#6b7280", fontStyle: 'italic', marginTop: 4 }}>
                      {allergy.notes}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p style={s.p}>
              No hay alergias conocidas documentadas en el expediente médico.
            </p>
          )}
        </div>

        <hr style={s.hr} />

        {/* Diagnósticos */}
        <div style={{
          borderLeft: "3px solid #0284c7",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <h2 style={{ ...s.h2, color: "#0284c7", marginBottom: "12px" }}>
            🩺 Diagnósticos Activos
          </h2>
          {validConditions.length > 0 ? (
            <>
              <p style={s.p}>
                Los siguientes diagnósticos se encuentran activos en el expediente:
              </p>
              {validConditions.map((dx, i) => (
                <div key={i} style={s.bullet}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <strong>{dx.name}</strong>
                    <span style={{
                      background: dx.status?.toLowerCase().includes('activ') ? "#f0fdf4" : "#f9fafb",
                      color: dx.status?.toLowerCase().includes('activ') ? "#166534" : "#6b7280",
                      padding: "1px 6px",
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: "600"
                    }}>
                      {dx.status || 'Estado no especificado'}
                    </span>
                  </div>
                  {dx.date && (
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      Registrado: {dx.date}
                    </div>
                  )}
                  {dx.notes && (
                    <div style={{ fontSize: 13, color: "#6b7280", fontStyle: 'italic', marginTop: 4 }}>
                      {dx.notes}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p style={s.p}>
              No hay diagnósticos activos registrados en el expediente médico en este momento.
            </p>
          )}
        </div>

        <hr style={s.hr} />

        {/* Medicamentos */}
        <div style={{
          borderLeft: "3px solid #f59e0b",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <h2 style={{ ...s.h2, color: "#f59e0b", marginBottom: "12px" }}>
            💊 Medicamentos Activos
          </h2>
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
                      <td style={{ ...s.td, color: "#6b7280", fontSize: 13 }}>
                        {m.date || 'Fecha no disponible'}
                      </td>
                      <td style={s.td}>
                        <span style={{
                          background: "#f0fdf4",
                          color: "#166534",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          fontSize: "10px",
                          fontWeight: "600"
                        }}>
                          Activo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={s.p}>
              No hay medicamentos activos registrados en el sistema.
            </p>
          )}
        </div>

        <hr style={s.hr} />

        {/* Signos Vitales */}
        <div style={{
          borderLeft: "3px solid #059669",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <h2 style={{ ...s.h2, color: "#059669", marginBottom: "12px" }}>
            💓 Signos Vitales
          </h2>
          {vitalSigns ? (
            <>
              <p style={s.p}>
                Valores registrados en la consulta actual:
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginTop: "16px"
              }}>
                {vitalSigns.bloodPressure && (
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
                      Presión Arterial
                    </div>
                    <div style={{ fontWeight: "600", fontSize: 16 }}>{vitalSigns.bloodPressure}</div>
                  </div>
                )}
                {vitalSigns.heartRate && (
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
                      Frecuencia Cardíaca
                    </div>
                    <div style={{ fontWeight: "600", fontSize: 16 }}>{vitalSigns.heartRate} bpm</div>
                  </div>
                )}
                {vitalSigns.temperature && (
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
                      Temperatura
                    </div>
                    <div style={{ fontWeight: "600", fontSize: 16 }}>{vitalSigns.temperature}°C</div>
                  </div>
                )}
                {vitalSigns.oxygenSaturation && (
                  <div style={{ padding: "8px 0" }}>
                    <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>
                      Saturación O₂
                    </div>
                    <div style={{ fontWeight: "600", fontSize: 16 }}>{vitalSigns.oxygenSaturation}%</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p style={s.p}>
              Los signos vitales no han sido registrados para esta consulta.
            </p>
          )}
        </div>

        <hr style={s.hr} />

        {/* Resultados de Laboratorio */}
        <div style={{
          borderLeft: "3px solid #db2777",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <h2 style={{ ...s.h2, color: "#db2777", marginBottom: "12px" }}>
            🧪 Resultados de Laboratorio
          </h2>
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
                        color: r.flag && r.flag !== "Normal" ? "#d97706" : "#059669"
                      }}>
                        {r.value} {r.unit || ''}
                      </td>
                      <td style={{ ...s.td, color: "#6b7280", fontSize: 12 }}>{r.referenceRange || 'No disponible'}</td>
                      <td style={s.td}>
                        <span style={{
                          background: r.flag && r.flag !== "Normal" ? "#fef3c7" : "#f0fdf4",
                          color: r.flag && r.flag !== "Normal" ? "#d97706" : "#166534",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          fontSize: "10px",
                          fontWeight: "600"
                        }}>
                          {r.flag || "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={s.p}>
              No hay resultados de laboratorio disponibles.
            </p>
          )}
        </div>

        <hr style={s.hr} />

        {/* Inmunizaciones */}
        <div style={{
          borderLeft: "3px solid #10b981",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <h2 style={{ ...s.h2, color: "#10b981", marginBottom: "12px" }}>
            💉 Historial de Vacunación
          </h2>
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
                      <td style={{ ...s.td, color: "#6b7280", fontSize: 13 }}>
                        {v.date || 'Fecha no disponible'}
                      </td>
                      <td style={{ ...s.td, color: "#6b7280", fontSize: 13 }}>
                        {v.site || 'No especificado'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p style={s.p}>
              No hay registro de inmunizaciones en el expediente.
            </p>
          )}
        </div>

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
          <div style={{
            borderLeft: "3px solid #7c3aed",
            paddingLeft: "16px",
            margin: "24px 0"
          }}>
            <h2 style={{ ...s.h2, color: "#7c3aed", marginBottom: "12px" }}>
              📋 Historial de Consultas
            </h2>
            <p style={s.p}>
              {showAllConsultations
                ? `Todas las consultas médicas del paciente (${ipsData.encounters.length} registros):`
                : `Últimas ${Math.min(ipsData.encounters.length, 6)} consultas médicas del paciente:`
              }
            </p>

            <div style={{ marginTop: "16px" }}>
              {(showAllConsultations ? ipsData.encounters : ipsData.encounters.slice(0, 6)).map((encounter, i) => (
                <div key={i} style={{
                  ...s.bullet,
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "12px",
                  marginBottom: "12px",
                  cursor: "pointer"
                }}
                  onClick={() => openConsultationModal(encounter)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "6px"
                  }}>
                    <div>
                      <strong style={{ color: "#1e293b" }}>
                        {encounter.type || 'Consulta Médica'}
                      </strong>
                      {encounter.doctor && (
                        <div style={{
                          color: "#64748b",
                          fontSize: 13,
                          marginTop: 2
                        }}>
                          Dr. {encounter.doctor}
                        </div>
                      )}
                    </div>
                    <div style={{
                      color: "#64748b",
                      fontSize: 12,
                      textAlign: "right"
                    }}>
                      📅 {encounter.date}
                    </div>
                  </div>

                  {encounter.summary && (
                    <div style={{
                      color: "#64748b",
                      fontSize: 13,
                      fontStyle: 'italic',
                      marginTop: 4,
                      lineHeight: 1.4
                    }}>
                      {encounter.summary.length > 100
                        ? `${encounter.summary.substring(0, 100)}...`
                        : encounter.summary
                      }
                    </div>
                  )}

                  {encounter.patientNote && (
                    <div style={{
                      color: "#7c3aed",
                      fontSize: 12,
                      marginTop: 4,
                      fontWeight: 500
                    }}>
                      💬 Nota del paciente: {encounter.patientNote.length > 80
                        ? `${encounter.patientNote.substring(0, 80)}...`
                        : encounter.patientNote
                      }
                    </div>
                  )}

                  <div style={{
                    marginTop: "8px",
                    fontSize: 11,
                    color: "#94a3b8",
                    fontStyle: "italic"
                  }}>
                    👆 Haga clic para ver detalles completos
                  </div>
                </div>
              ))}
            </div>

            {ipsData.encounters.length > 6 && (
              <div style={{
                marginTop: "16px",
                textAlign: "center" as const,
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "4px",
                border: "1px solid #e2e8f0"
              }}>
                {!showAllConsultations ? (
                  <button
                    onClick={() => setShowAllConsultations(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7c3aed",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#5b21b6";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#7c3aed";
                    }}
                  >
                    📊 Ver todas las consultas ({ipsData.encounters.length} total)
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAllConsultations(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#7c3aed",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#5b21b6";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#7c3aed";
                    }}
                  >
                    📋 Mostrar solo las últimas 6 consultas
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal de detalles de consulta */}
        <ConsultationModal
          consultation={selectedConsultation}
          isOpen={showModal}
          onClose={closeConsultationModal}
        />

      </div>
    </div>
  );
}