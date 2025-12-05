/**
 * 프로덕션급 로깅 시스템
 * Pino를 사용한 구조화된 로깅
 */

import pino from 'pino';

// 로그 레벨 타입
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// 로거 설정
const loggerOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // 프로덕션: JSON 형식, 개발: 읽기 쉬운 형식
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),

  // 기본 메타데이터
  base: {
    env: process.env.NODE_ENV,
    app: 'codeb-cms',
    version: process.env.CMS_VERSION || '1.0.0',
  },

  // 타임스탬프 포맷
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // 에러 직렬화
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

// 전역 로거 인스턴스
export const logger = pino(loggerOptions);

/**
 * 컨텍스트가 있는 자식 로거 생성
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * 요청별 로거 생성
 */
export function createRequestLogger(request: Request) {
  const url = new URL(request.url);
  return logger.child({
    requestId: crypto.randomUUID(),
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get('user-agent'),
  });
}

/**
 * 성능 측정 유틸리티
 */
export class PerformanceLogger {
  private startTime: number;
  private logger: pino.Logger;
  private operation: string;

  constructor(operation: string, context?: Record<string, any>) {
    this.operation = operation;
    this.startTime = performance.now();
    this.logger = context ? createLogger(context) : logger;
    this.logger.info({ operation }, `Starting: ${operation}`);
  }

  end(additionalData?: Record<string, any>) {
    const duration = performance.now() - this.startTime;
    this.logger.info(
      {
        operation: this.operation,
        duration: `${duration.toFixed(2)}ms`,
        ...additionalData,
      },
      `Completed: ${this.operation}`
    );
    return duration;
  }

  error(error: Error, additionalData?: Record<string, any>) {
    const duration = performance.now() - this.startTime;
    this.logger.error(
      {
        operation: this.operation,
        duration: `${duration.toFixed(2)}ms`,
        err: error,
        ...additionalData,
      },
      `Failed: ${this.operation}`
    );
  }
}

/**
 * 데이터베이스 쿼리 로거
 */
export const dbLogger = createLogger({ component: 'database' });

/**
 * 인증 로거
 */
export const authLogger = createLogger({ component: 'auth' });

/**
 * API 로거
 */
export const apiLogger = createLogger({ component: 'api' });

/**
 * 캐시 로거
 */
export const cacheLogger = createLogger({ component: 'cache' });

/**
 * 보안 이벤트 로거
 */
export const securityLogger = createLogger({ component: 'security' });

/**
 * 비즈니스 로직 로거
 */
export const businessLogger = createLogger({ component: 'business' });

// 기본 export
export default logger;
