package com.sports.service;

import com.sports.entity.*;
import com.sports.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductDeletionTest {
    private final ProductRepository repository=mock(ProductRepository.class);
    private final ProductImageRepository images=mock(ProductImageRepository.class);
    private final ProductService service=new ProductService(repository,mock(CategoryRepository.class),mock(ReviewService.class),images);
    @BeforeEach void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin","",List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        when(repository.findByIdForUpdate(1L)).thenReturn(Optional.of(Product.builder().id(1L).stock(20).reservedStock(0).build()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void activeOrderOrReturnBlocksDeletionBeforeHistoryChanges() {
        when(repository.countActiveOrderReferences(1L)).thenReturn(1L);
        assertThrows(ResponseStatusException.class,()->service.deleteProduct(1L));
        verify(repository,never()).detachOrderHistory(anyLong());verifyNoInteractions(images);
        when(repository.countActiveOrderReferences(1L)).thenReturn(0L);
        when(repository.countActiveReturns(1L)).thenReturn(1L);
        assertThrows(ResponseStatusException.class,()->service.deleteProduct(1L));
        verify(repository,never()).delete(any(Product.class));
    }
    @Test void completedHistoryDoesNotPreventDeletionAndIsDetachedInsteadOfDeleted() {
        service.deleteProduct(1L);
        var sequence=inOrder(repository,images);
        sequence.verify(repository).findByIdForUpdate(1L);
        sequence.verify(repository).countActiveOrderReferences(1L);sequence.verify(repository).countActiveReturns(1L);
        sequence.verify(repository).detachOrderHistory(1L);sequence.verify(repository).detachReviewHistory(1L);
        sequence.verify(images).deleteByProductId(1L);sequence.verify(repository).delete(any(Product.class));
    }
    @Test void purchaseAndReviewSnapshotsSurviveProductChangesAndRemoval() {
        Product product=Product.builder().id(1L).name("Yonex Astrox 88D Pro").brand("Yonex").sku("HG-RACKET-001").build();
        var item=OrderItem.builder().product(product).price(BigDecimal.valueOf(4350000)).selectedWeight("4U-G5").quantity(1).build();
        item.captureProduct();product.setName("Tên đã sửa");item.captureProduct();item.setProduct(null);
        assertEquals("Yonex Astrox 88D Pro",item.getProductNameSnapshot());assertEquals("HG-RACKET-001",item.getProductSkuSnapshot());
        assertEquals(BigDecimal.valueOf(4350000),item.getPrice());assertEquals("4U-G5",item.getSelectedWeight());
        var review=Review.builder().product(product).rating(5).comment("Đánh giá đã lưu").build();review.captureProduct();review.setProduct(null);
        assertEquals("Tên đã sửa",review.getProductNameSnapshot());assertEquals("Đánh giá đã lưu",review.getComment());
    }
}
