
import React, { useEffect, useState } from 'react';
import { Logger } from '../services/logger';
import { Storage } from '../services/storage';
import { SystemAgentConfig } from '../types';
import { telegram } from '../services/telegramService';

interface SystemHealthAgentProps {
    config: SystemAgentConfig;
}

type AgentStatus = 'IDLE' | 'ANALYZING' | 'REPAIRING' | 'ALERT';

export const SystemHealthAgent: React.FC<SystemHealthAgentProps> = ({ config }) => {
    const [status, setStatus] = useState<AgentStatus>('IDLE');
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!config.enabled) return;

        const intervalId = setInterval(() => {
            performHealthCheck();
        }, config.monitoringInterval || 10000);

        return () => clearInterval(intervalId);
    }, [config]);

    const performHealthCheck = async () => {
        // 1. Get recent logs
        const logs = Logger.getLogs();
        const recentErrors = logs.filter(l => l.level === 'ERROR' && new Date(l.timestamp).getTime() > Date.now() - 30000);

        if (recentErrors.length > 0) {
            setStatus('ANALYZING');
            await handleErrors(recentErrors);
        } else {
            if (status !== 'IDLE') setStatus('IDLE');
        }
    };

    const handleErrors = async (errors: any[]) => {
        if (config.autoFix) {
            setStatus('REPAIRING');
            setIsVisible(true);
            
            // Analyze Error Types
            const isStorageError = errors.some(e => e.message.includes('Quota') || e.message.includes('Storage'));
            const isNetworkError = errors.some(e => e.message.includes('Network') || e.message.includes('fetch'));

            let actionTaken = '';

            if (isStorageError) {
                // Auto-fix: Clear non-essential storage
                Storage.remove('materials'); 
                Storage.remove('streams');
                actionTaken = 'Очистка кэша памяти';
            } else if (isNetworkError) {
                // Auto-fix: Simulated reconnection
                actionTaken = 'Перезапуск нейро-моста';
            } else {
                actionTaken = 'Оптимизация процессов';
            }

            setLastAction(actionTaken);
            telegram.haptic('warning');

            // Simulate repair duration
            setTimeout(() => {
                setStatus('IDLE');
                setTimeout(() => setIsVisible(false), 3000);
            }, 2000);
        } else {
            setStatus('ALERT');
            setIsVisible(true);
        }
    };

    if (!config.enabled && !isVisible) return null;

    return (
        <div className={`fixed bottom-24 right-4 z-[150] transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <div className="bg-[#14161B]/90 backdrop-blur-md border border-[#6C5DD3]/30 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-xs">
                {/* Agent Avatar / Status Indicator */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full opacity-20 animate-ping ${status === 'IDLE' ? 'bg-green-500' : status === 'REPAIRING' ? 'bg-[#6C5DD3]' : 'bg-red-500'}`}></div>
                    <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black ${
                        status === 'IDLE' ? 'border-green-500 text-green-500 bg-green-500/10' :
                        status === 'REPAIRING' ? 'border-[#6C5DD3] text-[#6C5DD3] bg-[#6C5DD3]/10' :
                        'border-red-500 text-red-500 bg-red-500/10'
                    }`}>
                        AI
                    </div>
                </div>

                <div className="flex-1">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                        status === 'IDLE' ? 'text-green-500' :
                        status === 'REPAIRING' ? 'text-[#6C5DD3]' :
                        'text-red-500'
                    }`}>
                        {status === 'IDLE' ? 'SYSTEM NORMAL' : status === 'REPAIRING' ? 'AUTO-FIXING...' : 'SYSTEM ALERT'}
                    </h4>
                    <p className="text-white/80 text-xs font-medium leading-tight">
                        {status === 'REPAIRING' ? `Агент: ${lastAction}` : 
                         status === 'ALERT' ? 'Обнаружены сбои. Требуется вмешательство.' : 
                         'Системы в норме.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
