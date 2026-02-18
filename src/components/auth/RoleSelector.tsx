import React from 'react'
import { User, Stethoscope, Users } from 'lucide-react'

export type UserRole = 'patient' | 'doctor' | 'secretary'

interface RoleSelectorProps {
  selectedRole: UserRole
  onRoleSelect: (role: UserRole) => void
  disabled?: boolean
}

export function RoleSelector({ selectedRole, onRoleSelect, disabled = false }: RoleSelectorProps) {
  const roles = [
    {
      id: 'patient' as UserRole,
      title: 'Paciente',
      description: 'Busco atención médica',
      icon: User,
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      selectedBorder: 'border-blue-500 ring-blue-500/20',
    },
    {
      id: 'doctor' as UserRole,
      title: 'Médico',
      description: 'Brindo atención médica',
      icon: Stethoscope,
      gradient: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
      selectedBorder: 'border-primary-500 ring-primary-500/20',
    },
    {
      id: 'secretary' as UserRole,
      title: 'Asistente',
      description: 'Administro agenda médica',
      icon: Users,
      gradient: 'from-accent-500 to-accent-600',
      bgColor: 'bg-accent-50',
      borderColor: 'border-accent-200',
      selectedBorder: 'border-accent-500 ring-accent-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {roles.map((role, index) => {
        const Icon = role.icon
        const isSelected = selectedRole === role.id

        return (
          <div
            key={role.id}
            className={`
              relative group cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105'}
              ${
                isSelected
                  ? `${role.selectedBorder} ring-2 shadow-md animate-scale-in ${role.bgColor}`
                  : `${role.borderColor} hover:${role.borderColor.replace('200', '300')} hover:bg-clinical-50`
              }
            `}
            onClick={() => {
              console.log('🎯 Role clicked:', role.id, 'disabled:', disabled)
              if (!disabled) {
                console.log('🎯 Calling onRoleSelect with:', role.id)
                onRoleSelect(role.id)
              }
            }}
            style={{
              animationDelay: `${index * 0.1}s`,
              animationFillMode: 'backwards'
            }}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute -top-2 -right-2 pointer-events-none">
                <div className="w-6 h-6 bg-gradient-to-r from-success-500 to-success-600 rounded-full flex items-center justify-center shadow-md animate-scale-in">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col items-center space-y-4">
              {/* Icon */}
              <div
                className={`
                  relative p-4 rounded-2xl transition-all duration-300
                  ${isSelected
                    ? `bg-gradient-to-br ${role.gradient} text-white shadow-md`
                    : `bg-clinical-100 text-clinical-600 group-hover:bg-clinical-200`
                  }
                `}
              >
                <Icon className="w-8 h-8" />

                {/* Glow effect on selected */}
                {isSelected && (
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-20 animate-pulse pointer-events-none`} />
                )}
              </div>

              {/* Text */}
              <div className="text-center space-y-1">
                <h3
                  className={`
                    text-lg font-semibold transition-colors duration-200
                    ${isSelected ? 'text-clinical-900' : 'text-clinical-700 group-hover:text-clinical-900'}
                  `}
                >
                  {role.title}
                </h3>
                <p className="text-sm text-clinical-500 group-hover:text-clinical-600 transition-colors duration-200">
                  {role.description}
                </p>
              </div>
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 -skew-x-12 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out rounded-2xl pointer-events-none" />
          </div>
        )
      })}
    </div>
  )
}