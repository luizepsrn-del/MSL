import { ArmazemRedis } from '../src/servidor/armazem';

/**
 * O armazém de produção, montado a partir do ambiente.
 *
 * Os arquivos vizinhos são adaptadores: eles montam isto e chamam a rota. A
 * lógica toda vive em `src/servidor/rotas.ts`, provada em Vitest sem rede.
 */
export const armazem = () => ArmazemRedis.doAmbiente(process.env);
