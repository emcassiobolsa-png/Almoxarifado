import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Movimentacao, Produto } from '../types';
import { 
  Smartphone, 
  ChevronLeft, 
  Barcode, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Check, 
  Search, 
  RefreshCw,
  Package,
  Clock,
  User,
  Inbox,
  Camera,
  CameraOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getCuiabaDateString } from '../lib/utils';
import { Html5Qrcode } from 'html5-qrcode';

interface ItemCaptado {
  id_produto: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  vencimento: string;
  cod_barras: string;
}

export function CaptacaoCelular() {
  // Navigation State
  const [selectedMov, setSelectedMov] = useState<Movimentacao | null>(null);
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Captura State
  const [inputBarcode, setInputBarcode] = useState('');
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [foundProduct, setFoundProduct] = useState<Produto | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [vencimento, setVencimento] = useState('');
  const [displayVencimento, setDisplayVencimento] = useState('');
  const [vencimentoError, setVencimentoError] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [itensCaptados, setItensCaptados] = useState<ItemCaptado[]>([]);

  // Camera Barcode Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Feedback State
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Play a neat scanner beep sound using purely standard browser Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 1000; // Perfect 1kHz scanning beep
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12); // fade out fast
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.error("Failed to play scanner beep:", err);
    }
  };

  // Safe numeric Date Mask formatting & validation for typing (dd/mm/aaaa) on mobile
  const handleDisplayVencimentoChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.length > 8) {
      digits = digits.slice(0, 8);
    }
    
    let formatted = "";
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += "/" + digits.slice(2, 4);
        if (digits.length > 4) {
          formatted += "/" + digits.slice(4, 8);
        }
      }
    }
    
    setDisplayVencimento(formatted);
    
    // Convert to database-friendly format (YYYY-MM-DD) if fully entered (8 digits)
    if (digits.length === 8) {
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      
      const dNum = parseInt(day, 10);
      const mNum = parseInt(month, 10);
      const yNum = parseInt(year, 10);
      
      // Basic logical date boundary checks
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31 && yNum >= 2020 && yNum <= 2100) {
        setVencimento(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        setVencimentoError(null);
      } else {
        setVencimento('');
        setVencimentoError("Data inválida.");
      }
    } else {
      setVencimento('');
      if (digits.length > 0 && digits.length < 8) {
        setVencimentoError("Preencha DD/MM/AAAA por favor");
      } else {
        setVencimentoError(null);
      }
    }
  };

  // Start the HTML5 Qrcode Scan Session
  const startScanner = async () => {
    setProductError(null);
    setIsCameraActive(true);
    
    // Tiny timeout to ensure DOM container #reader exists
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode("reader");
        scannerRef.current = html5Qrcode;
        
        await html5Qrcode.start(
          { facingMode: "environment" }, // Rear camera
          {
            fps: 12,
            qrbox: (width, height) => {
              // Custom landscape aperture to easily alignment EAN-13 barcodes
              const boxWidth = Math.min(width * 0.85, 300);
              const boxHeight = Math.min(height * 0.45, 120);
              return { width: boxWidth, height: boxHeight };
            }
          },
          (decodedText) => {
            // Decoded! Keep text and match product
            playBeep();
            setInputBarcode(decodedText);
            handleBarcodeSearch(decodedText);
            stopScanner();
          },
          () => {
            // Silent frame level failure ignore
          }
        );
      } catch (err) {
        console.error("Camera active error:", err);
        setProductError("Não foi possível acessar a câmera do celular. Verifique as permissões de câmera do seu navegador e tente de novo.");
        setIsCameraActive(false);
      }
    }, 250);
  };

  // Stop the Camera session
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner session:", err);
      } finally {
        scannerRef.current = null;
        setIsCameraActive(false);
      }
    } else {
      setIsCameraActive(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Scanner clean errors:", err));
      }
    };
  }, []);

  // Load all digitando movements
  const loadPedidossDigitando = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getMovimentacoes();
      // Filtra apenas as movimentações com status DIGITANDO
      const digitando = data.filter(m => m.status === 'DIGITANDO');
      setMovs(digitando);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Não foi possível carregar as movimentações.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPedidossDigitando();
  }, []);

  // When a movement is selected, load existing captures if any
  const handleSelectMov = (mov: Movimentacao) => {
    setSelectedMov(mov);
    setFoundProduct(null);
    setInputBarcode('');
    setVencimento('');
    setDisplayVencimento('');
    setVencimentoError(null);
    setQuantidade(1);
    setProductError(null);

    // If it already has saved cellular captures in DB, load them
    if (mov.justificativacessao) {
      try {
        const parsed = JSON.parse(mov.justificativacessao);
        if (parsed && parsed.isCapturaCelular && Array.isArray(parsed.itens)) {
          setItensCaptados(parsed.itens);
          return;
        }
      } catch (err) {
        // Objeto em formato texto comum ou inválido, ignora e inicia vazio
      }
    }
    setItensCaptados([]);
  };

  // Search product via barcode
  const handleBarcodeSearch = async (codeToSearch = inputBarcode) => {
    const cleanBarcode = codeToSearch.trim();
    if (!cleanBarcode) return;

    setIsSearchingProduct(true);
    setProductError(null);
    setFoundProduct(null);

    try {
      // Busca produto pelo código de barras no banco de dados
      const results = await api.getProdutos(cleanBarcode);
      // getProdutos filtra também por similaridade e retorna lista
      // Vamos tentar encontrar o mais exato ou pegar o primeiro se for código puro
      if (results && results.length > 0) {
        // Se pegou algo, pegamos o primeiro
        setFoundProduct(results[0]);
        // Tenta focar no campo seguinte de forma inteligente
        setProductError(null);
      } else {
        setProductError('Produto não cadastrado com este código de barras.');
      }
    } catch (err) {
      console.error(err);
      setProductError('Erro ao buscar código de barras.');
    } finally {
      setIsSearchingProduct(false);
    }
  };

  // Handle enter key on barcode field (supports physical scanners which append Enter)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch();
    }
  };

  // Add Item to the temporary session list
  const handleAddItem = () => {
    if (!foundProduct) {
      setProductError('Por favor, leia ou digite um código de barras válido primeiro.');
      return;
    }

    if (!vencimento) {
      setProductError('Por favor, informe a data de vencimento do produto.');
      return;
    }

    if (quantidade <= 0) {
      setProductError('Por favor, informe uma quantidade maior do que 0.');
      return;
    }

    // Check if item already exists in the captured list to group it or insert new
    const existingIndex = itensCaptados.findIndex(
      item => item.id_produto === foundProduct.id_produto && item.vencimento === vencimento
    );

    if (existingIndex !== -1) {
      const updated = [...itensCaptados];
      updated[existingIndex].quantidade += quantidade;
      setItensCaptados(updated);
    } else {
      const newItem: ItemCaptado = {
        id_produto: foundProduct.id_produto,
        descricao: foundProduct.descricao,
        unidade: foundProduct.unidade || 'UN',
        quantidade,
        vencimento,
        cod_barras: inputBarcode.trim()
      };
      setItensCaptados([newItem, ...itensCaptados]);
    }

    // Reset Form for next barcode
    setFoundProduct(null);
    setInputBarcode('');
    setQuantidade(1);
    setProductError(null);
    setVencimento('');
    setDisplayVencimento('');
    setVencimentoError(null);
    
    // Devolve o foco para o código de barras para facilitar próximo bip
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Remove individual item
  const handleRemoveItem = (index: number) => {
    setItensCaptados(prev => prev.filter((_, i) => i !== index));
  };

  // Save everything back to Supabase
  const handleSaveToMovimentacao = async () => {
    if (!selectedMov) return;
    if (itensCaptados.length === 0) {
      setErrorMessage('Adicione ao menos um produto na lista antes de salvar.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Montamos o rascunho de captações celular em formato JSON na coluna justificativacessao
      const capData = {
        isCapturaCelular: true,
        itens: itensCaptados,
        capturadoEm: new Date().toISOString()
      };

      const updatedMov: Movimentacao = {
        ...selectedMov,
        justificativacessao: JSON.stringify(capData)
      };

      await api.saveMovimentacao(updatedMov);

      setSaveSuccess(true);
      // Recarrega os pedidos
      await loadPedidossDigitando();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Ocorreu um erro ao salvar as captações no servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-[85vh] rounded-2xl shadow-sm border border-outline-variant overflow-hidden flex flex-col font-sans">
      
      {/* HEADER DA CAPTAÇÃO */}
      <div className="bg-primary text-white p-5 sticky top-0 z-20 shadow-md">
        {selectedMov ? (
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setSelectedMov(null)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h2 className="text-lg font-bold truncate">Captando Pedido #{selectedMov.id_movimentacao}</h2>
              <p className="text-xs text-white/80 font-mono truncate">{selectedMov.tipo_movimentaca}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Smartphone className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-black tracking-tight">Captação Celular</h1>
              <p className="text-xs text-white/80">Coletor de Dados de Entrada</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {/* BANNER DE SUCESSO */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-500 text-white p-4 rounded-xl shadow-md mb-4 text-center"
            >
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-base">Captação Salva com Sucesso!</h3>
              <p className="text-xs text-white/90 mt-1">
                Os dados foram vinculados à movimentação. Agora acesse no seu computador para confirmar a importação!
              </p>
              <button 
                onClick={() => {
                  setSaveSuccess(false);
                  setSelectedMov(null);
                }}
                className="mt-3 bg-white text-emerald-700 font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-white/90 transition-colors shadow-sm"
              >
                Voltar aos Pedidos
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FEEDBACK DE ERRO */}
        {errorMessage && (
          <div className="bg-red-50 text-red-700 border border-red-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 mb-4 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* ESTADO 1: LISTAR PEDIDOS DIGITANDO */}
        {!selectedMov && !saveSuccess && (
          <div className="flex-1 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pedidos Digitando ({movs.length})</h2>
              <button 
                onClick={loadPedidossDigitando}
                disabled={isLoading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                title="Recarregar lista"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-slate-500 mt-2 font-medium">Buscando pedidos ativos...</p>
              </div>
            ) : movs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                <Inbox className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Nenhum Pedido "Digitando" Encontrado</p>
                <p className="text-xs text-slate-400 mt-1">
                  Não há pedidos em aberto com status "Digitando" carregados no sistema no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[60vh]">
                {movs.map(mov => {
                  const hasCap = mov.justificativacessao && mov.justificativacessao.includes("isCapturaCelular");
                  let capCount = 0;
                  if (hasCap) {
                    try {
                      const p = JSON.parse(mov.justificativacessao || '');
                      capCount = p.itens?.length || 0;
                    } catch(_) {}
                  }

                  return (
                    <div 
                      key={mov.id_movimentacao}
                      onClick={() => handleSelectMov(mov)}
                      className="bg-white hover:bg-slate-100 active:bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block text-[10px] font-extrabold uppercase bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-200">
                            Pedido #{mov.id_movimentacao}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800 mt-1.5 truncate max-w-[200px]">
                            {mov.tipo_movimentaca}
                          </h3>
                        </div>
                        {hasCap && (
                          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 text-[10px] font-bold flex items-center space-x-1">
                            <span>📱 {capCount} {capCount === 1 ? 'item' : 'itens'}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[280px] font-medium text-slate-700">
                            Fornecedor/Pessoa: {mov.pessoa?.nome || 'Não informado'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Data: {new Date(mov.datahora).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ESTADO 2: FORMULARIO DE LEITURA DO PEDIDO */}
        {selectedMov && !saveSuccess && (
          <div className="flex-1 flex flex-col space-y-4">
            
            {/* VINCULO DA PESSOA / DETALHES RÁPIDOS */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Informações do Pedido</div>
              <div className="text-slate-800 font-bold text-sm truncate">{selectedMov.pessoa?.nome || 'Pessoa não informada'}</div>
              <div className="text-slate-500 font-medium">Fluxo: <span className="font-bold text-slate-700">{selectedMov.entrada_saida}</span></div>
            </div>

            {/* FORMULÁRIO DE CAPTURA RÁPIDA (O TIMONEIRO DO CELULAR) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Barcode className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Leitura do Produto</h3>
                </div>
                
                {/* Status Indicator */}
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 font-bold uppercase tracking-wide">
                  EAN-13 Nativo
                </span>
              </div>

              {/* CAMERA TOGGLE & VIEWFINDER */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={isCameraActive ? stopScanner : startScanner}
                  className={cn(
                    "w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-xs transition-all border select-none cursor-pointer",
                    isCameraActive
                      ? "bg-red-600 hover:bg-red-700 border-red-700"
                      : "bg-teal-600 hover:bg-teal-700 border-teal-700"
                  )}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="w-4 h-4 mr-1" />
                      <span>Desligar Câmera de Leitura</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-1" />
                      <span>Ler Código de Barras pela Câmera</span>
                    </>
                  )}
                </button>

                {isCameraActive && (
                  <div className="relative overflow-hidden rounded-xl border-2 border-teal-500 shadow-inner bg-black flex flex-col items-center justify-center transition-all">
                    <div id="reader" className="w-full" style={{ minHeight: '220px' }}></div>
                    
                    {/* Laser Scanner animation effect */}
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 rounded-full animate-bounce shadow-[0_0_8px_#ef4444] pointer-events-none" />
                    
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-[9px] text-teal-300 font-mono px-3 py-1 rounded-md uppercase tracking-wider font-extrabold select-none pointer-events-none">
                      Aponte a Linha Vermelha para o Código
                    </div>
                  </div>
                )}
              </div>

              {/* CAMPO DE CODIGO DE BARRAS */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Código de Barras (EAN-13 ou digitação)</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      ref={barcodeInputRef}
                      value={inputBarcode}
                      onChange={(e) => setInputBarcode(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      placeholder="Bipe ou digite o código..."
                      className="w-full text-sm py-2 px-3.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                    />
                    {isSearchingProduct && (
                      <div className="absolute right-2 top-2">
                        <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleBarcodeSearch()}
                    className="bg-primary hover:bg-primary-dark active:scale-95 text-white px-3.5 rounded-lg flex items-center justify-center transition-all"
                    type="button"
                    title="Buscar Produto"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MOSTRAR PRODUTO DETECTADO */}
              {foundProduct ? (
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 flex items-start space-x-2.5">
                  <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-700 flex-shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-emerald-900 leading-tight truncate">{foundProduct.descricao}</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">Unidade: <span className="font-bold">{foundProduct.unidade}</span> | ID: {foundProduct.id_produto}</div>
                  </div>
                </div>
              ) : (
                productError && (
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-100 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs font-medium">{productError}</span>
                  </div>
                )
              )}

              {/* MOSTRAR DATA DE VENCIMENTO E QUANTIDADE */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Vencimento do Lote</label>
                  <div className="relative">
                    <input 
                      type="text"
                      inputMode="numeric"
                      placeholder="DD/MM/AAAA"
                      value={displayVencimento}
                      onChange={(e) => handleDisplayVencimentoChange(e.target.value)}
                      className={cn(
                        "w-full text-sm py-2 px-3 rounded-lg border focus:outline-none focus:ring-2",
                        vencimentoError 
                          ? "border-amber-400 focus:ring-amber-500 text-amber-900 bg-amber-50/50" 
                          : vencimento 
                            ? "border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30 font-semibold"
                            : "border-slate-300 focus:ring-primary"
                      )}
                    />
                    {vencimentoError && (
                      <span className="absolute -bottom-5 left-1 text-[9px] text-amber-600 font-extrabold pb-0.5 tracking-wide uppercase">
                        {vencimentoError}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Quantidade</label>
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                    <button 
                      onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                      className="bg-slate-100 hover:bg-slate-200 px-3 text-lg font-bold text-slate-600 active:bg-slate-300 select-none"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      value={quantidade === 0 ? '' : quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      className="w-full text-center text-sm py-2 font-bold focus:outline-none border-x border-slate-200"
                    />
                    <button 
                      onClick={() => setQuantidade(q => q + 1)}
                      className="bg-slate-100 hover:bg-slate-200 px-3 text-lg font-bold text-slate-600 active:bg-slate-300 select-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTÃO ADICIONAR ITEM */}
              <button 
                type="button"
                onClick={handleAddItem}
                disabled={!foundProduct || !vencimento}
                className={cn(
                  "w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all",
                  foundProduct && vencimento 
                    ? "bg-slate-800 hover:bg-slate-900 active:scale-95" 
                    : "bg-slate-300 cursor-not-allowed"
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Carregar na Lista Temporária</span>
              </button>
            </div>

            {/* SEÇÃO ITENS CAPTADOS */}
            <div className="flex-1 flex flex-col min-h-[180px]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Itens Captados para Sincronizar ({itensCaptados.length})
              </h3>

              {itensCaptados.length === 0 ? (
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                  <Barcode className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Nenhum produto na lista</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Leia o código de barras e preencha as informações para carregar.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 flex-1 overflow-y-auto max-h-[40vh] shadow-sm divide-y divide-slate-100">
                  {itensCaptados.map((item, index) => {
                    // Formata a data para ler de forma mais amigável
                    const dataFormatada = item.vencimento ? new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '';

                    return (
                      <div key={`${item.id_produto}-${item.vencimento}-${index}`} className="p-3.5 flex items-center justify-between">
                        <div className="flex-1 overflow-hidden pr-2">
                          <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{item.descricao}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate uppercase">
                            EAN: <span className="font-mono font-bold text-slate-600">{item.cod_barras || 'N/D'}</span>
                          </span>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center text-[10px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded border border-sky-100">
                              <Calendar className="w-3 h-3 mr-1 text-sky-500" />
                              {dataFormatada}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">Qty: <span className="font-bold text-slate-700">{item.quantidade} {item.unidade}</span></span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors flex-shrink-0"
                          title="Remover Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOTÃO CONFIRMAR NO SUPABASE */}
            {itensCaptados.length > 0 && (
              <div className="pt-2 sticky bottom-0 bg-slate-50 py-3">
                <button 
                  onClick={handleSaveToMovimentacao}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark active:scale-95 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sincronizando com Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Captações no Pedido</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
