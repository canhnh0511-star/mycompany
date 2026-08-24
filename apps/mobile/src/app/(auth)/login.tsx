import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { AppHeading } from '@/components/AppHeading';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api/client';
import { biometrics } from '@/lib/auth/biometrics';
import { credentialStorage } from '@/lib/auth/credentialStorage';

// GAP đã biết (xác nhận qua audit code thật, 2026-08-24): backend `LoginRequest.email`
// (services/api/src/main/java/com/mycompany/api/dto/LoginRequest.java) bắt buộc `@Email` — chỉ nhận
// định danh dạng email, KHÔNG có cột/luồng tra cứu theo số điện thoại (`User` entity không có field
// phone, `AuthController.login` chỉ `userRepository.findByEmail`). Theo yêu cầu đổi UI sang Số điện
// thoại, field này TẠM THỜI vẫn gửi lên backend qua đúng key `email` của LoginRequest (không tự chế API
// mới ở đây) — nghĩa là đăng nhập BẰNG SỐ ĐIỆN THOẠI THẬT SẼ LUÔN 400 (backend validate `@Email`) cho
// tới khi có API backend nhận diện theo SĐT (đã ghi vào mục "API còn thiếu" của plan Hồ sơ). Admin seed
// hiện tại vẫn phải gõ đúng email seed sẵn (docs/adr/0004) để đăng nhập được ở v1.
const phoneSchema = z
  .string()
  .min(1, 'Bắt buộc nhập số điện thoại')
  .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ');

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Bắt buộc nhập mật khẩu'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Đăng nhập — chỉ Admin (ADR-0001, release 1). Không có "quên mật khẩu"/"đăng ký": tài khoản admin
 * được seed sẵn qua migration (ADR-0004). Đổi mật khẩu làm ở tab Hồ sơ sau khi đăng nhập.
 *
 * Đăng nhập nhanh (2026-08-24, theo yêu cầu đổi field + "Ghi nhớ mật khẩu" + chào lại người dùng cũ):
 * - Field định danh đổi từ Email sang Số điện thoại (label/keyboardType/validation) — xem GAP ở khối
 *   comment trên `phoneSchema`, backend hiện chưa hỗ trợ thật.
 * - Checkbox "Ghi nhớ mật khẩu" (mặc định TẮT) — bật thì lưu mật khẩu vào SecureStore
 *   (`credentialStorage.saveCredentials`, cùng chỗ lưu cho Face ID) để lần sau khỏi gõ lại; KHÔNG bật
 *   thì không lưu, không đụng gì tới mật khẩu đã lưu từ trước (vd Face ID vẫn hoạt động nếu đã bật).
 * - Nếu đã từng đăng nhập thành công (có `lastEmail`+`lastFullName` lưu sẵn) → mặc định vào "chế độ
 *   nhanh": ẩn field SĐT, hiện "Chào, {tên}" + chỉ hỏi mật khẩu; có nút nhỏ "Đổi tài khoản" quay lại
 *   form đầy đủ khi cần đăng nhập tài khoản khác.
 *
 * Giao diện theo mockup Claude Design (artboard "02 · Đăng nhập", `Nông trường cao su -
 * Mobile.dc.html`) — khối header xanh thương hiệu (logo + tên app "David Dũng" + "Nông trường Bình
 * Long", nguyên văn mockup — KHÔNG tự thay bằng tên khác, xem CLAUDE.md/app.json cho tên gói thật)
 * phía trên, form trắng bên dưới. Bám sát mockup gần hết: field Mật khẩu có toggle "Hiện/Ẩn" (không
 * dùng AppInput cho field này vì cần slot phụ). "Ghi nhớ mật khẩu"/chế độ chào lại là bổ sung MỚI
 * (2026-08-24, yêu cầu riêng) — mockup gốc không có, dựng tối giản theo đúng phong cách các field khác
 * trong màn (không có component Checkbox sẵn trong `components/ui`, dựng Pressable+Box thủ công).
 *
 * Đối chiếu lại pixel-cho-pixel với mockup (2026-08-23) — 3 lệch đã sửa:
 * 1) Ô nhập: mockup cao 52px/bo góc 10px (Input mặc định của UI kit chỉ ~36px `min-h-9`) — set style
 *    trực tiếp lên `Input` (View bọc ngoài, KHÔNG phải InputField/TextInput — tránh đụng lại đúng bug
 *    "path.split is not a function" của react-native-css khi style TextInput trực tiếp, xem
 *    BatchReviewScreen.tsx TableCell cùng ngày). Bỏ AppInput cho field email vì nó không có slot để
 *    style Input wrapper.
 * 2) Nút "Đăng nhập" mockup LUÔN solid xanh `#1F5A45` — trước đây đổi thành `outline` khi có nút sinh
 *    trắc học khiến 2 nút trông y hệt cấp độ nhau, sai ý đồ mockup (1 nút chính + 1 nút phụ rõ ràng).
 * 3) Thứ tự: mockup là field → nút "Đăng nhập" (chính) → divider "hoặc" → nút sinh trắc học (phụ) —
 *    trước đây nút sinh trắc học nằm TRÊN CÙNG, trước cả field, đảo ngược thứ tự ưu tiên của mockup.
 */
export default function LoginScreen() {
  // Root layout bọc MỌI route bằng SafeAreaView edges={['top']} (fix chung Android edge-to-edge) —
  // khoảng padding đó lộ ra nền trắng mặc định phía trên khối header xanh, trong khi mockup design
  // header xanh phải tràn full lên tận status bar. Kéo Box header lên bù đúng insets.top rồi cộng lại
  // vào paddingTop nội bộ — màu xanh phủ hết, logo/tên vẫn nằm đúng vị trí dưới status bar (phát hiện
  // khi test thật trên iPhone, 2026-08-23).
  const insets = useSafeAreaInsets();
  const { login, loginWithBiometrics } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  // "Chào lại" — có lastEmail/lastFullName sẵn thì mặc định gọn (không bắt gõ lại SĐT); null = đang
  // đọc credentialStorage lúc mount, chưa quyết được hiện chế độ nào (tránh nháy UI).
  const [lastAccount, setLastAccount] = useState<{ phone: string; fullName: string } | null | undefined>(
    undefined,
  );
  const [quickMode, setQuickMode] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  useEffect(() => {
    Promise.all([credentialStorage.getLastEmail(), credentialStorage.getLastFullName()]).then(
      ([phone, fullName]) => {
        if (phone) setValue('phone', phone);
        if (phone && fullName) {
          setLastAccount({ phone, fullName });
          setQuickMode(true);
        } else {
          setLastAccount(null);
        }
      },
    );
    Promise.all([biometrics.isAvailable(), credentialStorage.hasSavedCredentials()]).then(
      ([hardwareReady, hasSaved]) => setCanUseBiometric(hardwareReady && hasSaved),
    );
  }, [setValue]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      // Backend chỉ có field `email` (xem GAP đầu file) — gửi giá trị SĐT gõ được qua đúng key đó,
      // KHÔNG tự đổi tên field phía backend.
      await login({ email: values.phone, password: values.password }, { rememberPassword });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Không đăng nhập được, thử lại sau.');
    }
  }

  async function handleBiometricLogin() {
    setFormError(null);
    setBiometricLoading(true);
    try {
      await loginWithBiometrics();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBiometricLoading(false);
    }
  }

  /** "Đổi tài khoản" — thoát chế độ chào lại, hiện lại form đầy đủ để đăng nhập SĐT khác. Không xóa
   * `lastAccount`/credentialStorage ở đây (chỉ ẩn UI) — nếu user hủy giữa chừng, lần mở app sau vẫn chào
   * đúng người vừa đăng nhập gần nhất, không mất trạng thái vì 1 lần bấm nhầm. */
  function handleSwitchAccount() {
    setQuickMode(false);
    setValue('phone', '');
    setFormError(null);
  }

  const showQuickGreeting = quickMode && !!lastAccount;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header xanh đặt NGOÀI ScrollView — ScrollView tự clip nội dung theo khung của nó, nên marginTop
          âm bên trong ScrollView không thể "tràn" lên qua khỏi khoảng padding của SafeAreaView gốc
          (edges=['top'], _layout.tsx); phải là sibling thường mới bù được đúng insets.top (phát hiện
          khi test thật trên iPhone, 2026-08-23 — fix trước đặt trong ScrollView không ăn). */}
      <Box
        className="bg-primary items-center px-6"
        style={{ marginTop: -insets.top, paddingTop: insets.top + 36, paddingBottom: 36 }}
      >
        <VStack space="sm" className="items-center">
          <BrandMark size={56} />
          <VStack space="xs" className="items-center">
            <AppHeading size="xl" className="text-primary-foreground text-center">
              David Dũng
            </AppHeading>
            <AppText size="sm" className="text-primary-foreground/80 text-center">
              Nông trường Bình Long
            </AppText>
          </VStack>
        </VStack>
      </Box>

      <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
        <VStack space="md" className="flex-1 px-4 pt-[22px] pb-8">
          <AppHeading size="xl">Đăng nhập</AppHeading>

          {showQuickGreeting ? (
            <HStack space="sm" className="items-center justify-between">
              <AppText size="lg" className="font-medium">
                Chào, {lastAccount!.fullName}
              </AppText>
              <Pressable onPress={handleSwitchAccount} hitSlop={8}>
                <AppText size="sm" className="text-primary font-medium">
                  Đổi tài khoản
                </AppText>
              </Pressable>
            </HStack>
          ) : (
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <VStack space="xs">
                  <AppText size="sm" className="text-muted-foreground">
                    Số điện thoại
                  </AppText>
                  <Input isInvalid={!!errors.phone} style={{ height: 52, borderRadius: 10 }}>
                    <InputField
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="none"
                      keyboardType="phone-pad"
                    />
                  </Input>
                  {errors.phone?.message ? (
                    <AppText size="xs" className="text-destructive">
                      {errors.phone.message}
                    </AppText>
                  ) : null}
                </VStack>
              )}
            />
          )}

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <VStack space="xs">
                <AppText size="sm" className="text-muted-foreground">
                  Mật khẩu
                </AppText>
                <Input isInvalid={!!errors.password} style={{ height: 52, borderRadius: 10 }}>
                  <InputField
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    secureTextEntry={!showPassword}
                  />
                  {/* "Hiện/Ẩn" trong input — khớp mockup (artboard 02), AppInput không có slot phụ nên
                      dựng riêng field này thay vì mở rộng AppInput cho 1 chỗ dùng duy nhất. */}
                  <InputSlot className="pr-3">
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      <AppText size="sm" className="text-primary font-medium">
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </AppText>
                    </Pressable>
                  </InputSlot>
                </Input>
                {errors.password?.message ? (
                  <AppText size="xs" className="text-destructive">
                    {errors.password.message}
                  </AppText>
                ) : null}
              </VStack>
            )}
          />

          {/* Không có component Checkbox sẵn trong components/ui — dựng thủ công bằng Pressable+Box,
              cùng kích thước chạm (hitSlop) như toggle Hiện/Ẩn mật khẩu phía trên cho nhất quán. */}
          <Pressable
            onPress={() => setRememberPassword((v) => !v)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberPassword }}
          >
            <HStack space="sm" className="items-center">
              <Box
                className={rememberPassword ? 'bg-primary border-primary' : 'bg-background border-border'}
                style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}
              >
                {rememberPassword ? (
                  <AppText size="xs" className="text-primary-foreground font-bold">
                    ✓
                  </AppText>
                ) : null}
              </Box>
              <AppText size="sm">Ghi nhớ mật khẩu</AppText>
            </HStack>
          </Pressable>

          {formError ? (
            <AppText size="sm" className="text-destructive">
              {formError}
            </AppText>
          ) : null}

          {/* Nút chính LUÔN solid xanh (mockup) — nút sinh trắc học là lựa chọn PHỤ, đứng sau, cách
              nhau bằng divider "hoặc", không phải 2 nút ngang hàng đảo thứ tự như bản cũ. */}
          <AppButton size="lg" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} style={{ height: 52, borderRadius: 10 }}>
            Đăng nhập
          </AppButton>

          {canUseBiometric ? (
            <>
              <HStack space="sm" className="items-center">
                <Box className="flex-1 h-px bg-border" />
                <AppText size="xs" className="text-muted-foreground">
                  hoặc
                </AppText>
                <Box className="flex-1 h-px bg-border" />
              </HStack>
              <AppButton
                size="lg"
                variant="outline"
                onPress={handleBiometricLogin}
                isLoading={biometricLoading}
                style={{ height: 52, borderRadius: 10 }}
              >
                Đăng nhập bằng Face ID / vân tay
              </AppButton>
              <AppText size="xs" className="text-muted-foreground text-center px-3">
                Khuôn mặt được lưu trên máy, không gửi lên hệ thống. Máy mất mạng vẫn đăng nhập được.
              </AppText>
            </>
          ) : null}
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
