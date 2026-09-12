package com.sports.config;

import com.sports.entity.Category;
import com.sports.entity.Product;
import com.sports.entity.Role;
import com.sports.entity.User;
import com.sports.repository.CategoryRepository;
import com.sports.repository.ProductRepository;
import com.sports.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        initUsers();
        initCategoriesAndProducts();
    }

    private void initUsers() {
        if (userRepository.count() == 0) {
            log.info("Khởi tạo tài khoản mẫu ADMIN và USER...");
            User admin = User.builder()
                    .username("admin")
                    .email("admin@badminton.com")
                    .password(passwordEncoder.encode("admin123"))
                    .fullName("Quản Trị Viên")
                    .phone("0378188888")
                    .address("Hà Nội, Việt Nam")
                    .role(Role.ROLE_ADMIN)
                    .build();

            User user = User.builder()
                    .username("user")
                    .email("user@gmail.com")
                    .password(passwordEncoder.encode("user123"))
                    .fullName("Vương Xuân Giáp")
                    .phone("0378183960")
                    .address("Hà Nội, Việt Nam")
                    .role(Role.ROLE_USER)
                    .build();

            userRepository.saveAll(Arrays.asList(admin, user));
            log.info("Đã tạo user: admin/admin123 và user/user123");
        }
    }

    private void initCategoriesAndProducts() {
        if (productRepository.count() == 0) {
            log.info("Khởi tạo dữ liệu danh mục và 15+ mẫu vợt cầu lông chuyên nghiệp...");

            Category catVot = categoryRepository.findByName("Vợt Cầu Lông")
                    .orElseGet(() -> categoryRepository.save(Category.builder()
                            .name("Vợt Cầu Lông")
                            .description("Vợt cầu lông chính hãng từ các thương hiệu Yonex, Victor, Lining, Mizuno")
                            .build()));

            Category catGiay = categoryRepository.findByName("Giày Cầu Lông")
                    .orElseGet(() -> categoryRepository.save(Category.builder()
                            .name("Giày Cầu Lông")
                            .description("Giày cầu lông chuyên dụng bám sân, chống lật cổ chân")
                            .build()));

            Category catPhuKien = categoryRepository.findByName("Cước & Phụ Kiện")
                    .orElseGet(() -> categoryRepository.save(Category.builder()
                            .name("Cước & Phụ Kiện")
                            .description("Dây cước, quấn cán, túi vợt cầu lông cao cấp")
                            .build()));

            List<Product> products = Arrays.asList(
                    // 1. Yonex Astrox 100ZZ
                    Product.builder()
                            .name("Vợt Yonex Astrox 100ZZ Kurenai (Đỏ)")
                            .brand("Yonex")
                            .price(new BigDecimal("4250000"))
                            .originalPrice(new BigDecimal("4590000"))
                            .stock(15)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=60")
                            .description("Vợt cầu lông cao cấp số 1 thế giới của Viktor Axelsen. Đũa vợt Hyper Slim Shaft siêu mảnh, smash uy lực cắm sàn.")
                            .weightGrip("3U-G5")
                            .stiffness("Extra Stiff")
                            .balancePoint("Head-Heavy (Nặng đầu)")
                            .maxTension("28 lbs (12.5 kg)")
                            .playStyle("Tấn công uy lực, dồn ép áp đảo")
                            .category(catVot)
                            .build(),

                    // 2. Yonex Nanoflare 1000Z
                    Product.builder()
                            .name("Vợt Yonex Nanoflare 1000Z Lightning Yellow")
                            .brand("Yonex")
                            .price(new BigDecimal("4390000"))
                            .originalPrice(new BigDecimal("4650000"))
                            .stock(12)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1613918108466-292b78a8ef95?w=800&auto=format&fit=crop&q=60")
                            .description("Cây vợt nắm giữ kỷ lục thế giới về tốc độ smash 565 km/h của Satwiksairaj Rankireddy. Tốc độ vung vợt chớp nhoáng.")
                            .weightGrip("4U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Light (Nhẹ đầu)")
                            .maxTension("28 lbs (12.5 kg)")
                            .playStyle("Tốc độ chớp nhoáng, phản tạt tì đè lưới")
                            .category(catVot)
                            .build(),

                    // 3. Yonex Arcsaber 11 Pro
                    Product.builder()
                            .name("Vợt Yonex Arcsaber 11 Pro Grayish Pearl")
                            .brand("Yonex")
                            .price(new BigDecimal("4150000"))
                            .originalPrice(new BigDecimal("4400000"))
                            .stock(20)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c?w=800&auto=format&fit=crop&q=60")
                            .description("Huyền thoại kiểm soát cầu và điều phối trận đấu của Aaron Chia. Công nghệ Control-Assist Bumper giữ cầu lâu hơn trên mặt vợt.")
                            .weightGrip("4U-G5")
                            .stiffness("Medium Stiff")
                            .balancePoint("Even (Cân bằng)")
                            .maxTension("27 lbs (12.0 kg)")
                            .playStyle("Công thủ toàn diện, điều cầu chính xác tuyệt đối")
                            .category(catVot)
                            .build(),

                    // 4. Yonex Astrox 88D Pro Gen 3
                    Product.builder()
                            .name("Vợt Yonex Astrox 88D Pro Gen 3 Silver/Black")
                            .brand("Yonex")
                            .price(new BigDecimal("4350000"))
                            .originalPrice(new BigDecimal("4600000"))
                            .stock(10)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1521537634581-0dced2fed2e7?w=800&auto=format&fit=crop&q=60")
                            .description("Dành riêng cho tay đập cầu sau trong đánh đôi. Tăng cường khả năng truyền lực tối đa cho pha đập cầu liên tục.")
                            .weightGrip("3U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Heavy (Nặng đầu)")
                            .maxTension("29 lbs (13.0 kg)")
                            .playStyle("Chuyên công cầu sau đánh đôi, smash liên tục")
                            .category(catVot)
                            .build(),

                    // 5. Victor Thruster Ryuga II
                    Product.builder()
                            .name("Vợt Victor Thruster Ryuga II (Rồng Lửa Lee Zii Jia)")
                            .brand("Victor")
                            .price(new BigDecimal("3850000"))
                            .originalPrice(new BigDecimal("4200000"))
                            .stock(8)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=60")
                            .description("Thanh kiếm rồng lửa của Lee Zii Jia. Thân vợt trang bị WES 2.0 giúp góc đập cắm hơn, trợ lực tối ưu.")
                            .weightGrip("3U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Heavy (Nặng đầu)")
                            .maxTension("31 lbs (14.0 kg)")
                            .playStyle("Tấn công hủy diệt, đập cầu sấm sét")
                            .category(catVot)
                            .build(),

                    // 6. Victor Auraspeed 100X
                    Product.builder()
                            .name("Vợt Victor Auraspeed 100X (Vợt Mohammad Ahsan)")
                            .brand("Victor")
                            .price(new BigDecimal("3700000"))
                            .originalPrice(new BigDecimal("3990000"))
                            .stock(14)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60")
                            .description("Dòng vợt tốc độ đỉnh cao của huyền thoại Ahsan. Khung vợt Dynamic-Sword xé gió, phản tạt thần tốc.")
                            .weightGrip("4U-G5")
                            .stiffness("Medium Stiff")
                            .balancePoint("Even (Cân bằng)")
                            .maxTension("28 lbs (12.5 kg)")
                            .playStyle("Phản tạt tốc độ, gài cầu biến ảo")
                            .category(catVot)
                            .build(),

                    // 7. Lining Axforce 90 Max Tiger
                    Product.builder()
                            .name("Vợt Lining Axforce 90 Max Hổ Gầm (Tiger)")
                            .brand("Lining")
                            .price(new BigDecimal("4600000"))
                            .originalPrice(new BigDecimal("4900000"))
                            .stock(9)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=60")
                            .description("Vợt của Loh Kean Yew. Khung Carbon M50 siêu đàn hồi, cảm giác smash uy lực rung chuyển sàn đấu.")
                            .weightGrip("4U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Heavy (Nặng đầu)")
                            .maxTension("30 lbs (13.5 kg)")
                            .playStyle("Tấn công dồn dập, smash bùng nổ")
                            .category(catVot)
                            .build(),

                    // 8. Lining Halbertec 9000
                    Product.builder()
                            .name("Vợt Lining Halbertec 9000 (Vợt Yuta Watanabe)")
                            .brand("Lining")
                            .price(new BigDecimal("4450000"))
                            .originalPrice(new BigDecimal("4800000"))
                            .stock(16)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&auto=format&fit=crop&q=60")
                            .description("Vợt thi đấu của thiên tài điều cầu Yuta Watanabe. Kiểm soát cầu tinh tế, xoay chuyển công thủ linh hoạt như nước.")
                            .weightGrip("4U-G5")
                            .stiffness("Medium")
                            .balancePoint("Even (Cân bằng)")
                            .maxTension("29 lbs (13.0 kg)")
                            .playStyle("Kiểm soát trận đấu, điều cầu hiểm hóc toàn diện")
                            .category(catVot)
                            .build(),

                    // 9. Lining Tectonic 9
                    Product.builder()
                            .name("Vợt Lining Tectonic 9 (Vợt Kidambi Srikanth)")
                            .brand("Lining")
                            .price(new BigDecimal("3950000"))
                            .originalPrice(new BigDecimal("4300000"))
                            .stock(11)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1558365849-6ebd8b0454b2?w=800&auto=format&fit=crop&q=60")
                            .description("Công nghệ khung gãy Tectonic trợ lực bộc phát năng lượng tức thì trong từng pha vung vợt.")
                            .weightGrip("4U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Heavy (Nặng đầu)")
                            .maxTension("30 lbs (13.5 kg)")
                            .playStyle("Công thủ toàn năng thiên công, ra đòn bất ngờ")
                            .category(catVot)
                            .build(),

                    // 10. Mizuno Fortius 11 Quick
                    Product.builder()
                            .name("Vợt Mizuno Fortius 11 Quick")
                            .brand("Mizuno")
                            .price(new BigDecimal("4200000"))
                            .originalPrice(new BigDecimal("4500000"))
                            .stock(7)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&fit=crop&q=60")
                            .description("Đỉnh cao chế tác thủ công Nhật Bản. Hệ thống Beyond Force System dồn quán tính vào điểm va chạm.")
                            .weightGrip("4U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Heavy (Nặng đầu)")
                            .maxTension("27 lbs (12.0 kg)")
                            .playStyle("Tấn công nhanh cự ly ngắn, chặn đẩy sắc bén")
                            .category(catVot)
                            .build(),

                    // 11. Yonex Astrox 77 Pro
                    Product.builder()
                            .name("Vợt Yonex Astrox 77 Pro High Orange")
                            .brand("Yonex")
                            .price(new BigDecimal("3450000"))
                            .originalPrice(new BigDecimal("3700000"))
                            .stock(22)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=60")
                            .description("Cây vợt quốc dân được An Se Young sử dụng thống trị đơn nữ thế giới. Thân dẻo trợ lực êm ái, công thủ dễ dàng.")
                            .weightGrip("4U-G5")
                            .stiffness("Medium")
                            .balancePoint("Head-Heavy (Hơi nặng đầu)")
                            .maxTension("28 lbs (12.5 kg)")
                            .playStyle("Công thủ toàn diện thiên công, trợ lực hoàn hảo")
                            .category(catVot)
                            .build(),

                    // 12. Yonex Nanoflare 800 Pro
                    Product.builder()
                            .name("Vợt Yonex Nanoflare 800 Pro Deep Green")
                            .brand("Yonex")
                            .price(new BigDecimal("4150000"))
                            .originalPrice(new BigDecimal("4400000"))
                            .stock(13)
                            .reservedStock(0)
                            .imageUrl("https://images.unsplash.com/photo-1562077772-3ab12188cb85?w=800&auto=format&fit=crop&q=60")
                            .description("Chuyên gia lái cầu và phản xạ trên lưới. Mặt vợt nhỏ gọn giúp tốc độ vung tăng 11% so với bản thông thường.")
                            .weightGrip("4U-G5")
                            .stiffness("Stiff")
                            .balancePoint("Head-Light (Nhẹ đầu)")
                            .maxTension("28 lbs (12.5 kg)")
                            .playStyle("Tốc độ, chèn lưới và phòng thủ thoát cầu")
                            .category(catVot)
                            .build()
            );

            productRepository.saveAll(products);
            log.info("Đã khởi tạo thành công 12 cây vợt danh tiếng vào CSDL!");
        }
    }
}
