/* eslint-disable @next/next/no-img-element */
'use client';


import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, uploadProductImage } from '@/services/product.service';
import type { ProductPayload } from '@/types/product';
import { Category } from '@/types/category';
import { getCategories } from '@/services/category.service';

// 👉 import NCC
import { getSuppliers, type Supplier } from '@/services/supplier.service';
// 👉 import Units
import { getUnits } from '@/services/unit.service';
import type { Unit } from '@/types/unit';

// 👉 import Stores và Stock
import { getStores, type Store as StoreType } from '@/services/store.service';
import { createOrUpdateStock } from '@/services/stock.service';

import { aiProductDescription, ocrProduct } from '@/services/ai.service';

import { parseMoney, resolveStoreIdFromWarehouseLabel } from '@/lib/utils';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  loading: () => (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-2" />
      <div className="h-32 bg-gray-200 rounded" />
    </div>
  ),
  ssr: false,
});
import { productSchema, type ProductFormData } from '@/lib/validation';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField, Input, Select } from '@/components/common/FormField';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useUser } from '@/hooks/useUser';

export default function CreateProductPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const userRoles = user?.roles || [];

  const canCreate = hasPermission(userRoles, PERMISSIONS.PRODUCT_CREATE);

  useEffect(() => {
    if (!userLoading && !canCreate) {
      router.replace('/products');
    }
  }, [userLoading, canCreate, router]);

  // form state (mã sẽ tự động tạo)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // danh mục từ BE
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement | null>(null);

  // 👉 danh sách Units từ BE
  const [units, setUnits] = useState<Unit[]>([]);

  // 👉 danh sách Stores và tồn kho ban đầu
  const [stores, setStores] = useState<StoreType[]>([]);
  const [initialStoreId, setInitialStoreId] = useState<number | ''>('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [initialMinStock, setInitialMinStock] = useState('');
  const [initialMaxStock, setInitialMaxStock] = useState('');

  // AI mô tả sản phẩm
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDescriptions, setAiDescriptions] = useState<{
    short?: string;
    seo?: string;
    long?: string;
    attributes?: string[];
  } | null>(null);
  const [selectedDescriptionType, setSelectedDescriptionType] = useState<'short' | 'seo' | 'long'>('long');

  // AI OCR sản phẩm
  const [processingOCR, setProcessingOCR] = useState(false);
  const ocrFileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrProducts, setOcrProducts] = useState<Array<{
    name: string;
    code?: string | null;
    price?: number | null;
    description?: string | null;
    category?: string | null;
    unit?: string | null;
    brand?: string | null;
    specifications?: string | null;
    supplier?: string | null;
    warehouse?: string | null;
  }>>([]); // Danh sách sản phẩm từ OCR
  const [showOcrProductsModal, setShowOcrProductsModal] = useState(false);
  const [selectedOcrProductIndex, setSelectedOcrProductIndex] = useState<number | null>(null);
  const [selectedOcrProductIndices, setSelectedOcrProductIndices] = useState<number[]>([]); // Danh sách sản phẩm đã chọn để thêm
  const [addingMultipleProducts, setAddingMultipleProducts] = useState(false);
  const [addingAllProducts, setAddingAllProducts] = useState(false);
  const [addingProgress, setAddingProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [showOcrRawDataModal, setShowOcrRawDataModal] = useState(false);
  const [ocrRawData, setOcrRawData] = useState<string | null>(null); // Dữ liệu thô từ OCR

  // Danh sách các form sản phẩm đã chọn từ OCR
  const [selectedProductForms, setSelectedProductForms] = useState<Array<{
    id: string; // Unique ID cho mỗi form
    ocrIndex: number; // Index trong ocrProducts
    name: string;
    categoryId: number | '';
    unitId: number | '';
    price: string;
    description: string;
    status: 'active' | 'inactive';
    supplierIds: number[];
    initialStoreId: number | '';
    initialQuantity: string;
    initialMinStock: string;
    initialMaxStock: string;
    imageFile: File | null;
    imagePreview: string | null;
  }>>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [catList, supplierList, unitList, storeList] = await Promise.all([
          getCategories(),
          getSuppliers(),
          getUnits(),
          getStores(),
        ]);
        if (!cancelled) {
          setCategories(catList);
          setSuppliers(supplierList);
          setUnits(unitList);
          setStores(storeList);
          // Set default unit nếu có và chưa có unit nào được chọn
          if (unitList.length > 0 && unitId === '') {
            const activeUnit = unitList.find((u) => u.active !== false) || unitList[0];
            if (activeUnit) {
              setUnitId(activeUnit.id);
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Lỗi tải dữ liệu:', message);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy một lần khi mount

  // Lọc suppliers theo search term
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm.trim()) return suppliers;
    const searchLower = supplierSearchTerm.toLowerCase();
    return suppliers.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(searchLower);
      const codeMatch = s.code?.toLowerCase().includes(searchLower);
      const typeMatch = s.type?.toLowerCase().includes(searchLower);
      return nameMatch || codeMatch || typeMatch;
    });
  }, [suppliers, supplierSearchTerm]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý chọn/bỏ chọn NCC
  const toggleSupplier = (supplierIdNum: number) => {
    setSelectedSupplierIds((prev) => {
      if (prev.includes(supplierIdNum)) {
        const newIds = prev.filter((id) => id !== supplierIdNum);
        // Cập nhật supplierId chính (NCC đầu tiên)
        setSupplierId(newIds.length > 0 ? newIds[0] : '');
        return newIds;
      } else {
        const newIds = [...prev, supplierIdNum];
        // Cập nhật supplierId chính (NCC đầu tiên)
        setSupplierId(newIds[0]);
        return newIds;
      }
    });
  };

  // Form validation
  const form = useFormValidation<ProductFormData>({
    schema: productSchema,
    initialValues: {
      name: '',
      categoryId: undefined,
      unitId: undefined,
      price: '',
      description: '',
      status: 'active',
    },
    onSubmit: async (data) => {
      setError(null);
      setSuccess(null);
      setLoading(true);

      try {
        let imagePath: string | null = null;

        if (imageFile) {
          // BE trả về relative path: /uploads/products/xxx.jpg
          imagePath = await uploadProductImage(imageFile);
        }

        // Cắt ngắn mô tả nếu quá dài (giới hạn 2000 ký tự để an toàn với database)
        const trimmedDescription = description && description.length > 2000
          ? description.substring(0, 2000) + '...'
          : description;

        // Lấy NCC đầu tiên làm NCC chính (tương thích với backend hiện tại)
        const mainSupplierId = selectedSupplierIds.length > 0
          ? selectedSupplierIds[0]
          : (supplierId === '' ? null : Number(supplierId));

        // Danh sách NCC (many-to-many)
        const supplierIdsList = selectedSupplierIds.length > 0
          ? selectedSupplierIds
          : (supplierId !== '' ? [Number(supplierId)] : null);

        const payload: ProductPayload = {
          code: '', // Mã sẽ được tự động tạo ở backend
          name: data.name,
          shortDescription: trimmedDescription,
          image: imagePath, // Lưu relative path vào DB
          unitPrice: parseMoney(data.price),
          status: data.status,
          supplierId: mainSupplierId,
          supplierIds: supplierIdsList, // Danh sách NCC (many-to-many)
          categoryId: data.categoryId,
          // 👉 map unitId
          unitId: data.unitId,
        };

        const createdProduct = await createProduct(payload);

        // Nếu có chọn kho và nhập số lượng tồn ban đầu, tạo stock record
        if (initialStoreId && initialQuantity && Number(initialQuantity) > 0) {
          try {
            await createOrUpdateStock({
              productId: createdProduct.id,
              storeId: Number(initialStoreId),
              quantity: Number(initialQuantity),
              minStock: initialMinStock ? Number(initialMinStock) : undefined,
              maxStock: initialMaxStock ? Number(initialMaxStock) : undefined,
            });
          } catch (stockErr) {
            const message = stockErr instanceof Error ? stockErr.message : String(stockErr);
            if (process.env.NODE_ENV === 'development') {
              console.warn('Lỗi tạo tồn kho ban đầu:', message);
            }
            // Không throw error, chỉ log vì sản phẩm đã tạo thành công
          }
        }

        // Nếu đang thêm nhiều sản phẩm từ OCR, tự động fill sản phẩm tiếp theo
        if (addingMultipleProducts && ocrProducts.length > 0 && selectedOcrProductIndices.length > 0) {
          // Tìm index của sản phẩm vừa tạo
          const currentIndex = selectedOcrProductIndex;
          if (currentIndex !== null) {
            // Tìm sản phẩm tiếp theo trong danh sách đã chọn
            const currentPos = selectedOcrProductIndices.indexOf(currentIndex);
            if (currentPos >= 0 && currentPos < selectedOcrProductIndices.length - 1) {
              // Còn sản phẩm tiếp theo
              const nextIndex = selectedOcrProductIndices[currentPos + 1];
              setSelectedOcrProductIndex(nextIndex);
              fillProductToForm(ocrProducts[nextIndex]);
              // Reset form để điền sản phẩm mới
              setImageFile(null);
              setImagePreview(null);
              setError(null);
              setLoading(false);
              // Hiển thị thông báo
              setSuccess(`Đã thêm sản phẩm "${data.name}". Đang điền thông tin sản phẩm tiếp theo...`);
              // Clear success message sau 3 giây
              setTimeout(() => setSuccess(null), 3000);
              // Không redirect, giữ lại trang để thêm sản phẩm tiếp theo
              return;
            } else {
              // Đã thêm hết, đóng modal và redirect
              setAddingMultipleProducts(false);
              setShowOcrProductsModal(false);
              setOcrProducts([]);
              setSelectedOcrProductIndices([]);
              setSuccess(`Đã thêm ${selectedOcrProductIndices.length} sản phẩm thành công!`);
              router.push('/products');
              return;
            }
          }
        }

        router.push('/products');
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi lưu hàng hóa';
        setError(message);
        // Nếu đang thêm nhiều sản phẩm mà có lỗi, dừng lại
        if (addingMultipleProducts) {
          setAddingMultipleProducts(false);
          setShowOcrProductsModal(true); // Mở lại modal để user có thể chọn lại
        }
        throw err; // Re-throw để form validation biết có lỗi
      } finally {
        setLoading(false);
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
  });

  // Sync form values with local state
  useEffect(() => {
    form.setValue('name', name);
    form.setValue('categoryId', categoryId === '' ? undefined : Number(categoryId));
    form.setValue('unitId', unitId === '' ? undefined : Number(unitId));
    form.setValue('price', price);
    form.setValue('description', description);
    form.setValue('status', status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, categoryId, unitId, price, description, status]);

  const handleSubmit = async (e: FormEvent) => {
    await form.handleSubmit(e);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // Hàm chuyển file sang base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Hàm tạo form data từ OCR product
  const createFormDataFromOcrProduct = (product: {
    name: string;
    code?: string | null;
    price?: number | null;
    description?: string | null;
    category?: string | null;
    unit?: string | null;
    brand?: string | null;
    specifications?: string | null;
    supplier?: string | null;
    warehouse?: string | null;
  }, ocrIndex: number) => {
    let formCategoryId: number | '' = '';
    let formUnitId: number | '' = '';
    let formSupplierIds: number[] = [];
    let formStoreId: number | '' = '';

    // Tìm category
    if (product.category) {
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase().includes(product.category!.toLowerCase()) ||
          product.category!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matchedCategory) {
        formCategoryId = matchedCategory.id;
      }
    }

    // Tìm unit
    if (product.unit) {
      const matchedUnit = units.find(
        (u) => u.name.toLowerCase().includes(product.unit!.toLowerCase()) ||
          product.unit!.toLowerCase().includes(u.name.toLowerCase())
      );
      if (matchedUnit) {
        formUnitId = matchedUnit.id;
      }
    }

    // Tìm supplier
    if (product.supplier) {
      const matchedSupplier = suppliers.find(
        (s) => s.name.toLowerCase().includes(product.supplier!.toLowerCase()) ||
          product.supplier!.toLowerCase().includes(s.name.toLowerCase())
      );
      if (matchedSupplier) {
        formSupplierIds = [matchedSupplier.id];
      }
    }

    // Tìm warehouse
    if (product.warehouse && stores.length > 0) {
      const resolvedStoreId = resolveStoreIdFromWarehouseLabel(
        product.warehouse,
        stores as StoreType[]
      );
      if (resolvedStoreId) {
        formStoreId = resolvedStoreId;
      }
    }

    const priceNumber = product.price !== null && product.price !== undefined
      ? (typeof product.price === 'number' ? product.price : parseNumber(String(product.price)))
      : null;

    return {
      id: `product-${ocrIndex}-${Date.now()}`,
      ocrIndex,
      name: product.name || '',
      categoryId: formCategoryId,
      unitId: formUnitId,
      price: priceNumber ? priceNumber.toLocaleString('vi-VN') : '',
      description: product.description || '',
      status: 'active' as const,
      supplierIds: formSupplierIds,
      initialStoreId: formStoreId,
      initialQuantity: '',
      initialMinStock: '',
      initialMaxStock: '',
      imageFile: null,
      imagePreview: null,
    };
  };

  // Hàm fill thông tin sản phẩm vào form
  const fillProductToForm = (product: {
    name?: string | null;
    code?: string | null;
    price?: number | null;
    description?: string | null;
    category?: string | null;
    unit?: string | null;
    brand?: string | null;
    specifications?: string | null;
    supplier?: string | null;
    warehouse?: string | null;
  }) => {
    if (product.name) {
      setName(product.name);
      form.setValue('name', product.name);
    }
    if (product.price) {
      const priceNumber = typeof product.price === 'number' ? product.price : parseNumber(String(product.price));
      const priceStr = priceNumber ? priceNumber.toLocaleString('vi-VN') : '';
      setPrice(priceStr);
      form.setValue('price', priceStr);
    }
    if (product.description) {
      setDescription(product.description);
      form.setValue('description', product.description);
    }
    if (product.category) {
      // Tìm category theo tên
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase().includes(product.category!.toLowerCase()) ||
          product.category!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matchedCategory) {
        setCategoryId(matchedCategory.id);
        form.setValue('categoryId', matchedCategory.id);
      }
    }
    if (product.unit) {
      // Tìm unit theo tên
      const matchedUnit = units.find(
        (u) => u.name.toLowerCase().includes(product.unit!.toLowerCase()) ||
          product.unit!.toLowerCase().includes(u.name.toLowerCase())
      );
      if (matchedUnit) {
        setUnitId(matchedUnit.id);
        form.setValue('unitId', matchedUnit.id);
      }
    }

    // Điền NCC (nhà cung cấp)
    if (product.supplier) {
      // Tìm supplier theo tên (fuzzy match)
      const matchedSupplier = suppliers.find(
        (s) => s.name.toLowerCase().includes(product.supplier!.toLowerCase()) ||
          product.supplier!.toLowerCase().includes(s.name.toLowerCase())
      );
      if (matchedSupplier) {
        setSupplierId(matchedSupplier.id);
        setSelectedSupplierIds([matchedSupplier.id]);
        setSupplierSearchTerm(matchedSupplier.name);
      } else {
        // Nếu không tìm thấy, vẫn set search term để user có thể tạo mới
        setSupplierSearchTerm(product.supplier);
      }
    }

    // Điền kho hàng
    if (product.warehouse && stores.length > 0) {
      const resolvedStoreId = resolveStoreIdFromWarehouseLabel(
        product.warehouse,
        stores as StoreType[]
      );
      if (resolvedStoreId) {
        setInitialStoreId(resolvedStoreId);
      }
    }
  };

  // Hàm xử lý OCR từ ảnh sản phẩm
  const handleProductOCR = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chỉ chọn file ảnh');
      e.target.value = '';
      return;
    }

    try {
      setProcessingOCR(true);
      setError(null);

      // Cập nhật preview
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setImageFile(file);

      // Convert sang base64
      const imageBase64 = await fileToBase64(file);

      // Gọi API OCR
      const ocrResult = await ocrProduct({
        imageBase64,
      });

      // Lưu raw data để hiển thị
      if (ocrResult.rawText) {
        try {
          // Format JSON nếu có thể
          const formattedJson = JSON.stringify(JSON.parse(ocrResult.rawText), null, 2);
          setOcrRawData(formattedJson);
        } catch {
          // Nếu không phải JSON, lưu raw text
          setOcrRawData(ocrResult.rawText);
        }
      } else {
        // Nếu không có rawText, tạo JSON từ kết quả
        setOcrRawData(JSON.stringify(ocrResult, null, 2));
      }

      // Xử lý nhiều sản phẩm (nếu có)
      if (ocrResult.products && ocrResult.products.length > 0) {
        // Luôn hiển thị modal để user chọn sản phẩm muốn thêm (kể cả chỉ có 1 sản phẩm)
        // Transform products to match expected type
        const transformedProducts = ocrResult.products.map(p => ({
          name: p.name || '',
          code: p.code || null,
          price: p.price || null,
          description: p.description || null,
          category: p.category || null,
          unit: p.unit || null,
          brand: p.brand || null,
          specifications: p.specifications || null,
          supplier: p.supplier || null,
          warehouse: p.warehouse || null,
        }));
        setOcrProducts(transformedProducts);
        setShowOcrProductsModal(true);
        setSelectedOcrProductIndex(0); // Chọn sản phẩm đầu tiên mặc định
        setSelectedOcrProductIndices([0]); // Tự động chọn sản phẩm đầu tiên
        setError(null);
        // Tạm thời fill sản phẩm đầu tiên vào form
        fillProductToForm(ocrResult.products[0]);
      } else {
        // Không có mảng products, tạo mảng từ single product
        const singleProduct = {
          name: ocrResult.name || '',
          code: ocrResult.code || null,
          price: ocrResult.price || null,
          description: ocrResult.description || null,
          category: ocrResult.category || null,
          unit: ocrResult.unit || null,
          brand: ocrResult.brand || null,
          specifications: ocrResult.specifications || null,
          supplier: ocrResult.supplier || null,
          warehouse: ocrResult.warehouse || null,
        };
        setOcrProducts([singleProduct]);
        setShowOcrProductsModal(true);
        setSelectedOcrProductIndex(0);
        setSelectedOcrProductIndices([0]);
        setError(null);
        fillProductToForm(singleProduct);
      }

      // Hiển thị thông báo thành công
      if (ocrResult.name || ocrResult.price || ocrResult.description) {
        setError(null);
        // Có thể thêm toast notification ở đây
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể đọc ảnh. Vui lòng thử lại.',
      );
    } finally {
      setProcessingOCR(false);
      e.target.value = '';
    }
  };

  // Hàm thêm tất cả sản phẩm đã chọn cùng lúc
  const handleAddAllSelectedProducts = async () => {
    if (selectedOcrProductIndices.length === 0 || ocrProducts.length === 0) {
      setError('Không có sản phẩm nào được chọn');
      return;
    }

    setAddingAllProducts(true);
    setError(null);
    setSuccess(null);
    setAddingProgress({ current: 0, total: selectedOcrProductIndices.length, currentName: '' });
    setShowOcrProductsModal(false);

    const productsToAdd = selectedOcrProductIndices.map(idx => ocrProducts[idx]);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < productsToAdd.length; i++) {
      const product = productsToAdd[i];
      setAddingProgress({
        current: i + 1,
        total: productsToAdd.length,
        currentName: product.name || `Sản phẩm ${i + 1}`
      });

      try {
        // Reset form trước khi fill
        setName('');
        setCategoryId('');
        setUnitId('');
        setPrice('');
        setDescription('');
        setSelectedSupplierIds([]);
        setSupplierId('');
        setInitialStoreId('');
        setInitialQuantity('');
        setInitialMinStock('');
        setInitialMaxStock('');
        setImageFile(null);
        setImagePreview(null);

        // Fill form với sản phẩm hiện tại
        fillProductToForm(product);

        // Đợi một chút để form được cập nhật
        await new Promise(resolve => setTimeout(resolve, 200));

        // Validate form
        const currentCategoryId = categoryId === '' ? undefined : Number(categoryId);
        const currentUnitId = unitId === '' ? undefined : Number(unitId);
        const currentPrice = product.price ? product.price.toLocaleString('vi-VN') : '';

        // Validate required fields
        if (!currentCategoryId || !currentUnitId) {
          throw new Error(`Sản phẩm "${product.name || 'Chưa có tên'}": Vui lòng chọn danh mục và đơn vị tính`);
        }

        const formData: ProductFormData = {
          name: product.name || '',
          categoryId: currentCategoryId,
          unitId: currentUnitId,
          price: currentPrice,
          description: product.description || '',
          status: 'active',
        };

        // Validate
        const validationResult = productSchema.safeParse(formData);
        if (!validationResult.success) {
          throw new Error(`Sản phẩm "${product.name || 'Chưa có tên'}": ${validationResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ'}`);
        }

        // Tạo payload
        const trimmedDescription = formData.description && formData.description.length > 2000
          ? formData.description.substring(0, 2000) + '...'
          : formData.description;

        const mainSupplierId = selectedSupplierIds.length > 0
          ? selectedSupplierIds[0]
          : (supplierId === '' ? null : Number(supplierId));

        const supplierIdsList = selectedSupplierIds.length > 0
          ? selectedSupplierIds
          : (supplierId !== '' ? [Number(supplierId)] : null);

        const payload: ProductPayload = {
          code: '',
          name: formData.name,
          shortDescription: trimmedDescription,
          image: null, // Không upload ảnh khi thêm nhiều sản phẩm cùng lúc
          unitPrice: parseMoney(formData.price),
          status: formData.status,
          supplierId: mainSupplierId,
          supplierIds: supplierIdsList,
          categoryId: formData.categoryId,
          unitId: formData.unitId,
        };

        // Tạo sản phẩm
        const createdProduct = await createProduct(payload);

        // Tạo stock nếu có
        if (initialStoreId && initialQuantity && Number(initialQuantity) > 0) {
          try {
            await createOrUpdateStock({
              productId: createdProduct.id,
              storeId: Number(initialStoreId),
              quantity: Number(initialQuantity),
              minStock: initialMinStock ? Number(initialMinStock) : undefined,
              maxStock: initialMaxStock ? Number(initialMaxStock) : undefined,
            });
          } catch {
            // Ignore stock errors
          }
        }

        successCount++;
      } catch (err) {
        errorCount++;
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Sản phẩm "${product.name}": ${message}`);
      }
    }

    setAddingAllProducts(false);
    setAddingProgress({ current: 0, total: 0, currentName: '' });
    setOcrProducts([]);
    setSelectedOcrProductIndices([]);
    setSelectedOcrProductIndex(null);

    if (errorCount === 0) {
      setSuccess(`Đã thêm thành công ${successCount} sản phẩm!`);
      setTimeout(() => {
        router.push('/products');
      }, 2000);
    } else if (successCount > 0) {
      setError(`Đã thêm ${successCount} sản phẩm thành công. ${errorCount} sản phẩm gặp lỗi:\n${errors.join('\n')}`);
    } else {
      setError(`Không thể thêm sản phẩm nào:\n${errors.join('\n')}`);
    }
  };

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Thêm hàng hóa</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Tạo mới hàng hóa trong hệ thống</p>
      </div>

      {/* Hiển thị các form sản phẩm đã chọn từ OCR */}
      {selectedProductForms.length > 0 && (
        <div className="mb-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-blue-gray-800">
              Sản phẩm đã chọn từ AI ({selectedProductForms.length})
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (selectedProductForms.length === 0) return;

                  setAddingAllProducts(true);
                  setError(null);
                  setSuccess(null);
                  setAddingProgress({ current: 0, total: selectedProductForms.length, currentName: '' });

                  let successCount = 0;
                  let errorCount = 0;
                  const errors: string[] = [];

                  for (let i = 0; i < selectedProductForms.length; i++) {
                    const formData = selectedProductForms[i];
                    setAddingProgress({
                      current: i + 1,
                      total: selectedProductForms.length,
                      currentName: formData.name || `Sản phẩm ${i + 1}`
                    });

                    try {
                      let imagePath: string | null = null;

                      if (formData.imageFile) {
                        imagePath = await uploadProductImage(formData.imageFile);
                      }

                      const trimmedDescription = formData.description && formData.description.length > 2000
                        ? formData.description.substring(0, 2000) + '...'
                        : formData.description;

                      const mainSupplierId = formData.supplierIds.length > 0
                        ? formData.supplierIds[0]
                        : null;

                      const payload: ProductPayload = {
                        code: '',
                        name: formData.name,
                        shortDescription: trimmedDescription,
                        image: imagePath,
                        unitPrice: parseMoney(formData.price),
                        status: formData.status,
                        supplierId: mainSupplierId,
                        supplierIds: formData.supplierIds.length > 0 ? formData.supplierIds : null,
                        categoryId: formData.categoryId === '' ? undefined : Number(formData.categoryId),
                        unitId: formData.unitId === '' ? undefined : Number(formData.unitId),
                      };

                      const createdProduct = await createProduct(payload);

                      if (formData.initialStoreId && formData.initialQuantity && Number(formData.initialQuantity) > 0) {
                        try {
                          await createOrUpdateStock({
                            productId: createdProduct.id,
                            storeId: Number(formData.initialStoreId),
                            quantity: Number(formData.initialQuantity),
                            minStock: formData.initialMinStock ? Number(formData.initialMinStock) : undefined,
                            maxStock: formData.initialMaxStock ? Number(formData.initialMaxStock) : undefined,
                          });
                        } catch {
                          // Ignore
                        }
                      }

                      successCount++;
                    } catch (err) {
                      errorCount++;
                      const message = err instanceof Error ? err.message : String(err);
                      errors.push(`Sản phẩm "${formData.name}": ${message}`);
                    }
                  }

                  setAddingAllProducts(false);
                  setAddingProgress({ current: 0, total: 0, currentName: '' });

                  if (errorCount === 0) {
                    setSuccess(`Đã thêm thành công ${successCount} sản phẩm!`);
                    setSelectedProductForms([]);
                    setTimeout(() => {
                      router.push('/products');
                    }, 2000);
                  } else if (successCount > 0) {
                    setError(`Đã thêm ${successCount} sản phẩm thành công. ${errorCount} sản phẩm gặp lỗi:\n${errors.join('\n')}`);
                    // Xóa các form đã lưu thành công (giữ lại các form có lỗi)
                    const failedProductNames = errors.map(e => {
                      const match = e.match(/Sản phẩm "([^"]+)"/);
                      return match ? match[1] : null;
                    }).filter(Boolean);
                    setSelectedProductForms(prev => prev.filter(form =>
                      failedProductNames.includes(form.name)
                    ));
                  } else {
                    setError(`Không thể thêm sản phẩm nào:\n${errors.join('\n')}`);
                  }
                }}
                disabled={addingAllProducts || selectedProductForms.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingAllProducts ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang thêm ({addingProgress.current}/{addingProgress.total})...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm tất cả ({selectedProductForms.length} sản phẩm)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductForms([])}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
          {selectedProductForms.map((formData, formIndex) => (
            <div key={formData.id} className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Sản phẩm {formIndex + 1}: {formData.name || 'Chưa có tên'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductForms(prev => prev.filter((_, idx) => idx !== formIndex));
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Form fields sẽ được thêm ở đây - tạm thời hiển thị thông tin cơ bản */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tên:</span> {formData.name}
                </div>
                <div>
                  <span className="font-medium">Giá:</span> {formData.price || 'Chưa có'}
                </div>
                <div>
                  <span className="font-medium">Danh mục:</span>{' '}
                  {formData.categoryId !== ''
                    ? categories.find(c => c.id === formData.categoryId)?.name || 'Chưa chọn'
                    : 'Chưa chọn'}
                </div>
                <div>
                  <span className="font-medium">Đơn vị:</span>{' '}
                  {formData.unitId !== ''
                    ? units.find(u => u.id === formData.unitId)?.name || 'Chưa chọn'
                    : 'Chưa chọn'}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      let imagePath: string | null = null;

                      if (formData.imageFile) {
                        imagePath = await uploadProductImage(formData.imageFile);
                      }

                      const trimmedDescription = formData.description && formData.description.length > 2000
                        ? formData.description.substring(0, 2000) + '...'
                        : formData.description;

                      const mainSupplierId = formData.supplierIds.length > 0
                        ? formData.supplierIds[0]
                        : null;

                      const payload: ProductPayload = {
                        code: '',
                        name: formData.name,
                        shortDescription: trimmedDescription,
                        image: imagePath,
                        unitPrice: parseMoney(formData.price),
                        status: formData.status,
                        supplierId: mainSupplierId,
                        supplierIds: formData.supplierIds.length > 0 ? formData.supplierIds : null,
                        categoryId: formData.categoryId === '' ? undefined : Number(formData.categoryId),
                        unitId: formData.unitId === '' ? undefined : Number(formData.unitId),
                      };

                      const createdProduct = await createProduct(payload);

                      if (formData.initialStoreId && formData.initialQuantity && Number(formData.initialQuantity) > 0) {
                        try {
                          await createOrUpdateStock({
                            productId: createdProduct.id,
                            storeId: Number(formData.initialStoreId),
                            quantity: Number(formData.initialQuantity),
                            minStock: formData.initialMinStock ? Number(formData.initialMinStock) : undefined,
                            maxStock: formData.initialMaxStock ? Number(formData.initialMaxStock) : undefined,
                          });
                        } catch {
                          // Ignore
                        }
                      }

                      setSelectedProductForms(prev => prev.filter((_, idx) => idx !== formIndex));
                      setSuccess(`Đã thêm sản phẩm "${formData.name}" thành công!`);
                      setTimeout(() => setSuccess(null), 3000);
                    } catch (err) {
                      const message = err instanceof Error ? err.message : String(err);
                      setError(`Lỗi khi lưu sản phẩm "${formData.name}": ${message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !formData.name || formData.categoryId === '' || formData.unitId === '' || !formData.price}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-60"
                >
                  Lưu sản phẩm này
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Fill vào form chính để chỉnh sửa
                    setName(formData.name);
                    setCategoryId(formData.categoryId);
                    setUnitId(formData.unitId);
                    setPrice(formData.price);
                    setDescription(formData.description);
                    setStatus(formData.status);
                    setSelectedSupplierIds(formData.supplierIds);
                    setSupplierId(formData.supplierIds.length > 0 ? formData.supplierIds[0] : '');
                    setInitialStoreId(formData.initialStoreId);
                    setInitialQuantity(formData.initialQuantity);
                    setInitialMinStock(formData.initialMinStock);
                    setInitialMaxStock(formData.initialMaxStock);
                    setImageFile(formData.imageFile);
                    setImagePreview(formData.imagePreview);
                    // Xóa form đã chọn
                    setSelectedProductForms(prev => prev.filter((_, idx) => idx !== formIndex));
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
                >
                  Chỉnh sửa trong form chính
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
        <div className="p-6">
          <h2 className="text-xl font-bold text-center mb-6 text-blue-gray-800">
            {selectedProductForms.length > 0 ? 'THÊM HÀNG HÓA MỚI' : 'THÊM HÀNG HÓA'}
          </h2>

          {error && (
            <div className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
              {error}
            </div>
          )}

          {/* Hiển thị thông báo success/error */}
          {(error || success) && (
            <div className={`max-w-4xl mx-auto mb-4 p-4 rounded-lg ${error ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
              {error && <div className="font-medium whitespace-pre-line">{error}</div>}
              {success && <div className="font-medium">{success}</div>}
            </div>
          )}

          {/* Modal hiển thị progress khi đang thêm nhiều sản phẩm */}
          {addingAllProducts && (
            <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Đang thêm sản phẩm...
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Đang xử lý: {addingProgress.currentName}</span>
                    <span>{addingProgress.current} / {addingProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(addingProgress.current / addingProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Vui lòng đợi trong khi hệ thống đang thêm sản phẩm...
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Thông tin cơ bản */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Thông tin cơ bản
              </h3>

              {/* Tên hàng hóa */}
              <FormField
                label="Tên hàng hóa"
                required
                error={form.errors.name}
                touched={form.touched.name}
              >
                <Input
                  id="name"
                  type="text"
                  placeholder="Nhập tên hàng hóa"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    form.handleChange('name')(e.target.value);
                  }}
                  onBlur={form.handleBlur('name')}
                  error={form.errors.name}
                  touched={form.touched.name}
                />
              </FormField>

              {/* Nhóm hàng */}
              <FormField
                label="Nhóm hàng"
                required
                error={form.errors.categoryId}
                touched={form.touched.categoryId}
              >
                <Select
                  id="category"
                  value={categoryId}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value);
                    setCategoryId(value);
                    form.handleChange('categoryId')(value === '' ? undefined : value);
                  }}
                  onBlur={form.handleBlur('categoryId')}
                  error={form.errors.categoryId}
                  touched={form.touched.categoryId}
                >
                  <option value="">Chọn nhóm hàng</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {/* Thông tin nhà cung cấp và đơn vị */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Thông tin nhà cung cấp và đơn vị
              </h3>

              {/* Nhà cung cấp - Multi-select */}
              <div className="grid grid-cols-3 gap-4 items-start">
                <label
                  htmlFor="supplier"
                  className="text-sm font-medium text-gray-700 pt-2"
                >
                  Nhà cung cấp <span className="text-gray-400 text-xs">(tùy chọn, có thể chọn nhiều)</span>
                </label>
                <div className="col-span-2 space-y-2">
                  <div className="relative" ref={supplierDropdownRef}>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Tìm kiếm và chọn nhà cung cấp..."
                      value={supplierSearchTerm}
                      onChange={(e) => {
                        setSupplierSearchTerm(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                    />
                    {showSupplierDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredSuppliers.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            Không tìm thấy
                          </div>
                        ) : (
                          filteredSuppliers.map((s) => {
                            const isSelected = selectedSupplierIds.includes(s.id);
                            return (
                              <div
                                key={s.id}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${isSelected ? 'bg-blue-100 font-semibold' : ''
                                  }`}
                                onClick={() => toggleSupplier(s.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSupplier(s.id)}
                                  className="w-4 h-4"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span>
                                  {s.name} {s.type ? `(${s.type})` : ''}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  {/* Hiển thị các NCC đã chọn */}
                  {selectedSupplierIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedSupplierIds.map((id) => {
                        const supplier = suppliers.find((s) => s.id === id);
                        if (!supplier) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {supplier.name} {supplier.type ? `(${supplier.type})` : ''}
                            {id === selectedSupplierIds[0] && (
                              <span className="text-xs text-blue-600 font-semibold">(Chính)</span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleSupplier(id)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {selectedSupplierIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 NCC đầu tiên sẽ được lưu làm NCC chính. Các NCC khác sẽ được hiển thị trong hệ thống.
                    </p>
                  )}
                </div>
              </div>

              {/* Đơn vị tính */}
              <FormField
                label="Đơn vị tính"
                required
                error={form.errors.unitId}
                touched={form.touched.unitId}
              >
                <Select
                  id="unit"
                  value={unitId}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : Number(e.target.value);
                    setUnitId(value);
                    form.handleChange('unitId')(value === '' ? undefined : value);
                  }}
                  onBlur={form.handleBlur('unitId')}
                  error={form.errors.unitId}
                  touched={form.touched.unitId}
                >
                  <option value="">Chọn đơn vị tính</option>
                  {units
                    .filter((u) => u.active !== false)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </Select>
              </FormField>
            </div>

            {/* Thông tin giá và tồn kho */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Thông tin giá và tồn kho
              </h3>

              {/* Đơn giá (map sang unitPrice) */}
              <FormField
                label="Đơn giá"
                required
                error={form.errors.price}
                touched={form.touched.price}
              >
                <Input
                  id="price"
                  type="text"
                  placeholder="Nhập đơn giá"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    form.handleChange('price')(e.target.value);
                  }}
                  onBlur={form.handleBlur('price')}
                  error={form.errors.price}
                  touched={form.touched.price}
                />
              </FormField>

              {/* Tồn kho ban đầu (tùy chọn) */}
              <div className="border border-gray-200 rounded-lg p-5 bg-gray-50/50">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  Tồn kho ban đầu (tùy chọn)
                </h4>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <label
                    htmlFor="initialStore"
                    className="text-sm font-medium text-gray-700"
                  >
                    Kho hàng
                  </label>
                  <div className="col-span-2 relative">
                    <select
                      id="initialStore"
                      className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      value={initialStoreId}
                      onChange={(e) =>
                        setInitialStoreId(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                    >
                      <option value="">-- Chọn kho (để trống nếu không cần) --</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {initialStoreId && (
                  <>
                    <div className="grid grid-cols-3 gap-4 items-center mt-3">
                      <label
                        htmlFor="initialQuantity"
                        className="text-sm font-medium text-gray-700"
                      >
                        Số lượng tồn
                      </label>
                      <input
                        id="initialQuantity"
                        type="number"
                        min={0}
                        className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập số lượng tồn ban đầu"
                        value={initialQuantity}
                        onChange={(e) => setInitialQuantity(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-center mt-3">
                      <label
                        htmlFor="initialMinStock"
                        className="text-sm font-medium text-gray-700"
                      >
                        Tồn kho tối thiểu
                      </label>
                      <input
                        id="initialMinStock"
                        type="number"
                        min={0}
                        className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập tồn kho tối thiểu (tùy chọn)"
                        value={initialMinStock}
                        onChange={(e) => setInitialMinStock(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-center mt-3">
                      <label
                        htmlFor="initialMaxStock"
                        className="text-sm font-medium text-gray-700"
                      >
                        Tồn kho tối đa
                      </label>
                      <input
                        id="initialMaxStock"
                        type="number"
                        min={0}
                        className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập tồn kho tối đa (tùy chọn)"
                        value={initialMaxStock}
                        onChange={(e) => setInitialMaxStock(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Lưu ý: Nếu không nhập ở đây, tồn kho sẽ được tạo khi nhập hàng vào kho.
                </p>
              </div>
            </div>

            {/* Mô tả và hình ảnh */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Mô tả và hình ảnh
              </h3>

              {/* Mô tả + AI gợi ý */}
              <div className="grid grid-cols-3 gap-4 items-start">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700 pt-2"
                >
                  Mô tả
                </label>
                <div className="col-span-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Có thể nhập tay hoặc để AI gợi ý mô tả (3 phiên bản).
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!name.trim()) {
                          setAiError('Vui lòng nhập tên hàng hóa trước khi gọi AI.');
                          return;
                        }
                        setAiError(null);
                        setAiLoading(true);
                        try {
                          const data = await aiProductDescription(name);
                          setAiDescriptions({
                            short: data.shortDescription,
                            seo: data.seoDescription,
                            long: data.longDescription,
                            attributes: data.attributes,
                          });
                          // Mặc định chọn long description
                          setDescription(data.longDescription || data.seoDescription || data.shortDescription || '');
                          setSelectedDescriptionType('long');
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          if (process.env.NODE_ENV === 'development') {
                            console.warn('AI mô tả sản phẩm lỗi:', message);
                          }
                          setAiError(
                            err instanceof Error ? err.message : 'Có lỗi khi gọi AI.',
                          );
                        } finally {
                          setAiLoading(false);
                        }
                      }}
                      disabled={aiLoading}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      {aiLoading ? 'Đang sinh mô tả...' : 'Tạo lại mô tả bằng AI'}
                    </button>
                  </div>

                  {/* Hiển thị 3 phiên bản nếu có */}
                  {aiDescriptions && (
                    <div className="border border-sky-200 rounded-md p-3 bg-sky-50 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDescriptionType('short');
                            setDescription(aiDescriptions.short || '');
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedDescriptionType === 'short'
                            ? 'bg-sky-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-sky-100'
                            }`}
                        >
                          Ngắn
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDescriptionType('seo');
                            setDescription(aiDescriptions.seo || '');
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedDescriptionType === 'seo'
                            ? 'bg-sky-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-sky-100'
                            }`}
                        >
                          SEO
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDescriptionType('long');
                            setDescription(aiDescriptions.long || '');
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedDescriptionType === 'long'
                            ? 'bg-sky-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-sky-100'
                            }`}
                        >
                          Chi tiết
                        </button>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {selectedDescriptionType === 'short' && aiDescriptions.short && (
                          <p className="font-medium">Mô tả ngắn:</p>
                        )}
                        {selectedDescriptionType === 'seo' && aiDescriptions.seo && (
                          <p className="font-medium">Mô tả SEO:</p>
                        )}
                        {selectedDescriptionType === 'long' && aiDescriptions.long && (
                          <p className="font-medium">Mô tả chi tiết:</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gợi ý attributes */}
                  {aiDescriptions?.attributes && aiDescriptions.attributes.length > 0 && (
                    <div className="border border-amber-200 rounded-md p-3 bg-amber-50">
                      <p className="text-xs font-medium text-amber-800 mb-2">
                        Gợi ý thuộc tính (attributes):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {aiDescriptions.attributes.map((attr, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white border border-amber-300 rounded text-xs text-amber-900"
                          >
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Nhập hoặc chỉnh sửa mô tả sản phẩm"
                    className="min-h-[200px]"
                  />
                  {aiError && (
                    <p className="text-xs text-red-600">{aiError}</p>
                  )}
                </div>
              </div>

              {/* Hình ảnh */}
              <div className="grid grid-cols-3 gap-4 items-start mt-6">
                <label
                  htmlFor="image"
                  className="text-sm font-medium text-gray-700 pt-2"
                >
                  Hình ảnh
                </label>
                <div className="col-span-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => ocrFileInputRef.current?.click()}
                      disabled={processingOCR}
                      className="px-4 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-md font-medium text-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                      {processingOCR ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Đọc ảnh bằng AI
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={ocrFileInputRef}
                      className="hidden"
                      onChange={handleProductOCR}
                    />
                  </div>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Xem trước hình ảnh"
                      className="h-24 object-cover rounded border"
                    />
                  )}
                  {ocrProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOcrProductsModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium text-sm shadow-sm transition-colors flex items-center gap-2 w-full justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Chọn sản phẩm khác ({ocrProducts.length} sản phẩm)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Trạng thái */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Trạng thái
              </h3>
              <div className="grid grid-cols-3 gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">
                  Trạng thái
                </span>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Đang kinh doanh</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={status === 'inactive'}
                      onChange={() => setStatus('inactive')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Ngừng kinh doanh</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Nút action */}
            <div className="flex justify-center gap-6 mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-12 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal chọn sản phẩm từ OCR */}
      {showOcrProductsModal && ocrProducts.length > 0 && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600"
                    checked={ocrProducts.length > 0 && selectedOcrProductIndices.length === ocrProducts.length}
                    onChange={() => {
                      if (selectedOcrProductIndices.length === ocrProducts.length) {
                        setSelectedOcrProductIndices([]);
                      } else {
                        setSelectedOcrProductIndices(ocrProducts.map((_, idx) => idx));
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700">Chọn tất cả</span>
                </label>
                <h2 className="text-xl font-semibold text-gray-800">
                  Chọn sản phẩm muốn thêm ({ocrProducts.length} sản phẩm)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOcrProductsModal(false);
                  setOcrProducts([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {ocrProducts.map((product, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedOcrProductIndex === index || selectedOcrProductIndices.includes(index)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => {
                      // Toggle checkbox khi click vào bất kỳ đâu trong card
                      const isSelected = selectedOcrProductIndices.includes(index);
                      if (isSelected) {
                        setSelectedOcrProductIndices(selectedOcrProductIndices.filter(i => i !== index));
                      } else {
                        setSelectedOcrProductIndices([...selectedOcrProductIndices, index]);
                      }
                      // Vẫn fill vào form khi click
                      setSelectedOcrProductIndex(index);
                      fillProductToForm(product);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedOcrProductIndices.includes(index)}
                        onChange={() => {
                          // Logic này sẽ không chạy vì onClick của card đã xử lý
                          // Nhưng vẫn giữ để checkbox hiển thị đúng trạng thái
                        }}
                        onClick={(e) => {
                          // Ngăn event bubble lên card để tránh double toggle
                          e.stopPropagation();
                          const isSelected = selectedOcrProductIndices.includes(index);
                          if (isSelected) {
                            setSelectedOcrProductIndices(selectedOcrProductIndices.filter(i => i !== index));
                          } else {
                            setSelectedOcrProductIndices([...selectedOcrProductIndices, index]);
                          }
                          setSelectedOcrProductIndex(index);
                          fillProductToForm(product);
                        }}
                        className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-2">
                          {product.name || `Sản phẩm ${index + 1}`}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          {product.code && (
                            <div>
                              <span className="font-medium">Mã:</span> {product.code}
                            </div>
                          )}
                          {product.price && (
                            <div>
                              <span className="font-medium">Giá:</span>{' '}
                              {product.price.toLocaleString('vi-VN')} đ
                            </div>
                          )}
                          {product.category && (
                            <div>
                              <span className="font-medium">Danh mục:</span> {product.category}
                            </div>
                          )}
                          {product.unit && (
                            <div>
                              <span className="font-medium">Đơn vị:</span> {product.unit}
                            </div>
                          )}
                          {product.supplier && (
                            <div>
                              <span className="font-medium">NCC:</span> {product.supplier}
                            </div>
                          )}
                          {product.warehouse && (
                            <div>
                              <span className="font-medium">Kho:</span> {product.warehouse}
                            </div>
                          )}
                        </div>
                        {product.description && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Mô tả:</span> {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedOcrProductIndices.length > 0 ? (
                  <span>Đã chọn {selectedOcrProductIndices.length} sản phẩm</span>
                ) : (
                  <span>Chọn sản phẩm muốn thêm (có thể chọn nhiều)</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOcrProductsModal(false);
                    setOcrProducts([]);
                    setSelectedOcrProductIndices([]);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
                >
                  Đóng
                </button>
                {selectedOcrProductIndices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleAddAllSelectedProducts}
                    disabled={addingAllProducts}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {addingAllProducts ? (
                      <>
                        <svg className="animate-spin h-4 w-4 inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang thêm ({addingProgress.current}/{addingProgress.total})...
                      </>
                    ) : (
                      `Thêm tất cả (${selectedOcrProductIndices.length} sản phẩm)`
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    // Tạo form cho tất cả sản phẩm đã chọn
                    const newForms = selectedOcrProductIndices.map(idx =>
                      createFormDataFromOcrProduct(ocrProducts[idx], idx)
                    );
                    setSelectedProductForms(prev => [...prev, ...newForms]);
                    setShowOcrProductsModal(false);
                    setSelectedOcrProductIndices([]);
                    setSelectedOcrProductIndex(null);
                  }}
                  className="px-4 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors"
                >
                  {selectedOcrProductIndices.length > 1
                    ? `Thêm ${selectedOcrProductIndices.length} sản phẩm vào form`
                    : 'Thêm vào form'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị dữ liệu thô từ AI */}
      {showOcrRawDataModal && ocrRawData && (
        <div className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                Dữ liệu AI đã đọc được
              </h2>
              <button
                type="button"
                onClick={() => setShowOcrRawDataModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                  {ocrRawData}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  // Copy to clipboard
                  navigator.clipboard.writeText(ocrRawData);
                  setSuccess('Đã sao chép dữ liệu vào clipboard!');
                  setTimeout(() => setSuccess(null), 2000);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Sao chép
              </button>
              <button
                type="button"
                onClick={() => setShowOcrRawDataModal(false)}
                className="px-4 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
