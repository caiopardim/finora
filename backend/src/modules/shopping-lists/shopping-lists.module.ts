import { Module } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';

@Module({
  providers: [ShoppingListService],
  exports: [ShoppingListService],
})
export class ShoppingListsModule {}
