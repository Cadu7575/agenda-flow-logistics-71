
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Truck, User } from 'lucide-react';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduleActions } from '@/hooks/useScheduleActions';

interface SchedulingFormProps {
  selectedDate: Date | undefined;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  availableTimes: string[];
  onRefreshTimes: () => void;
  palletQuantity: string;
  setPalletQuantity: (quantity: string) => void;
}

const SchedulingForm = ({ 
  selectedDate, 
  selectedTime, 
  setSelectedTime, 
  availableTimes,
  onRefreshTimes,
  palletQuantity,
  setPalletQuantity
}: SchedulingFormProps) => {
  const [supplierName, setSupplierName] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [purchaseOrder, setPurchaseOrder] = useState<string>("");
  const [observations, setObservations] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [supplierAlreadyScheduled, setSupplierAlreadyScheduled] = useState(false);
  const { user } = useAuth();
  const { sendApprovalEmail } = useScheduleActions();

  // Verificar se fornecedor já tem agendamento no dia
  const checkSupplierSchedule = async () => {
    if (!selectedDate || !supplierName.trim()) {
      setSupplierAlreadyScheduled(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('id')
        .eq('supplier_name', supplierName.trim())
        .eq('scheduled_date', format(selectedDate, 'yyyy-MM-dd'))
        .in('status', ['approved', 'pending']);

      if (error) throw error;

      setSupplierAlreadyScheduled(data && data.length > 0);
    } catch (error) {
      console.error('Error checking supplier schedule:', error);
      setSupplierAlreadyScheduled(false);
    }
  };

  // Verificar quando fornecedor ou data mudam
  useEffect(() => {
    checkSupplierSchedule();
  }, [supplierName, selectedDate]);

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !supplierName || !vehicleType || !purchaseOrder || !palletQuantity) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (supplierAlreadyScheduled) {
      toast({
        title: "Fornecedor já agendado",
        description: "Este fornecedor já possui um agendamento para este dia. Escolha outra data.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para agendar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          user_id: user.id,
          supplier_name: supplierName,
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          scheduled_time: selectedTime,
          vehicle_type: vehicleType,
          delivery_type: 'geral',
          purchase_order: purchaseOrder,
          pallet_quantity: parseInt(palletQuantity),
          observations: observations || null,
          status: 'approved' // Auto-aprovado
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Enviar email automaticamente
      if (data?.id) {
        await sendApprovalEmail(data.id, 'approved');
      }

      toast({
        title: "Agendamento confirmado!",
        description: `Agendamento para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às ${selectedTime} confirmado automaticamente.`,
      });

      // Reset form
      setSelectedTime("");
      setSupplierName("");
      setVehicleType("");
      setPurchaseOrder("");
      setPalletQuantity("");
      setObservations("");
      onRefreshTimes();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Erro ao agendar",
        description: error.message || "Ocorreu um erro ao criar o agendamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="supplier" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Nome do Fornecedor *
        </Label>
        <Input
          id="supplier"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder="Digite o nome do fornecedor"
          className="border-gray-300 focus:border-green-500"
        />
        {supplierAlreadyScheduled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">
              ⚠️ Este fornecedor já possui um agendamento para este dia. Escolha outra data.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="palletQuantity">Quantidade de Pallet *</Label>
        <Input
          id="palletQuantity"
          type="number"
          min="1"
          value={palletQuantity}
          onChange={(e) => setPalletQuantity(e.target.value)}
          placeholder="Digite a quantidade de pallets"
          className="border-gray-300 focus:border-green-500"
        />
      </div>


      {selectedTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              Horário selecionado: {selectedTime}
            </span>
          </div>
          <div className="text-sm text-blue-600 mt-1">
            {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Tipo de Veículo *</Label>
        <Select value={vehicleType} onValueChange={setVehicleType}>
          <SelectTrigger className="border-gray-300 focus:border-green-500">
            <SelectValue placeholder="Selecione o tipo de veículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="van">Van</SelectItem>
            <SelectItem value="caminhao-pequeno">Caminhão Pequeno</SelectItem>
            <SelectItem value="caminhao-medio">Caminhão Médio</SelectItem>
            <SelectItem value="caminhao-grande">Caminhão Grande</SelectItem>
            <SelectItem value="carreta">Carreta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purchaseOrder">Ordem de Compra *</Label>
        <Input
          id="purchaseOrder"
          value={purchaseOrder}
          onChange={(e) => setPurchaseOrder(e.target.value)}
          placeholder="Digite o número da ordem de compra"
          className="border-gray-300 focus:border-green-500"
        />
      </div>


      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Informações adicionais sobre a entrega..."
          className="border-gray-300 focus:border-green-500 min-h-[80px]"
        />
      </div>

      <Button 
        onClick={handleSchedule}
        disabled={loading || !selectedTime || !supplierName || !vehicleType || !purchaseOrder || !palletQuantity || supplierAlreadyScheduled}
        className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
      >
        {loading ? 'Processando...' : 'Confirmar Agendamento'}
      </Button>
    </div>
  );
};

export default SchedulingForm;
